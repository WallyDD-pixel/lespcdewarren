import { prisma } from "./prisma";

// include contest card customization keys
export type SettingKey =
  | "PAYPAL_ENV"
  | "PAYPAL_SANDBOX_CLIENT_ID"
  | "PAYPAL_SANDBOX_SECRET"
  | "PAYPAL_LIVE_CLIENT_ID"
  | "PAYPAL_LIVE_SECRET"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_PUBLISHABLE_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "DISCORD_URL"
  | "MAINTENANCE_MODE"
  | "CONTEST_TITLE"
  | "CONTEST_IMAGE_URL"
  | "CONTEST_BG_COLOR"
  | "CONTEST_FOOTER_TEXT";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: string | null; at: number }>();

function hasSettingModel() {
  return Boolean((prisma as any)?.setting);
}

async function settingTableExists(): Promise<boolean> {
  try {
    // SQLite only; for other DBs, migrations doivent créer la table
    const rows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='Setting'"
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function ensureSettingTable(): Promise<boolean> {
  try {
    if (await settingTableExists()) return true;
    // Tentative de création (idempotent pour SQLite)
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Setting" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT, "updatedAt" DATETIME NOT NULL)'
    );
    return true;
  } catch {
    return false;
  }
}

async function readRaw(key: SettingKey): Promise<string | null> {
  try {
    if (!(await settingTableExists())) return null;
    // SQLite compatible
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT value FROM Setting WHERE key = ? LIMIT 1`,
      key
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const v = rows[0]?.value;
      return v == null ? null : String(v);
    }
    return null;
  } catch {
    return null;
  }
}

async function upsertRaw(key: SettingKey, value: string | null) {
  try {
    if (!(await ensureSettingTable())) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=CURRENT_TIMESTAMP`,
      key,
      value
    );
  } catch {
    // ignore
  }
}

async function read(key: SettingKey): Promise<string | null> {
  const now = Date.now();
  const c = cache.get(key);
  if (c && now - c.at < CACHE_TTL_MS) return c.value ?? null;
  try {
    let val: string | null;
    if (hasSettingModel()) {
      const row = await (prisma as any).setting.findUnique({ where: { key } });
      val = (row?.value ?? null) as string | null;
    } else {
      val = await readRaw(key);
    }
    cache.set(key, { value: val, at: now });
    return val;
  } catch {
    return null;
  }
}

async function readDirect(key: SettingKey): Promise<string | null> {
  try {
    if (hasSettingModel()) {
      const row = await (prisma as any).setting.findUnique({ where: { key } });
      return (row?.value ?? null) as string | null;
    }
    return readRaw(key);
  } catch {
    return null;
  }
}

export async function getSettings(keys: SettingKey[]): Promise<Record<SettingKey, string | null>> {
  const out = {} as Record<SettingKey, string | null>;
  await Promise.all(keys.map(async (k) => { out[k] = await read(k); }));
  return out;
}

export async function setSettings(updates: Partial<Record<SettingKey, string | null>>): Promise<void> {
  const entries = Object.entries(updates) as Array<[SettingKey, string | null]>;

  if (!entries.length) return;
  const now = Date.now();

  if (hasSettingModel()) {
    const ops = entries.map(([key, value]) =>
      (prisma as any).setting.upsert({ 
        where: { key }, 
        create: { key, value: value ?? null, updatedAt: new Date() }, 
        update: { value: value ?? null, updatedAt: new Date() } 
      })
    );
    await prisma.$transaction(ops);
  } else {
    for (const [key, value] of entries) {
      await upsertRaw(key, value ?? null);
    }
  }

  for (const [key, value] of entries) cache.set(key, { value: value ?? null, at: now });
}

export type PayPalConfig = { env: "sandbox" | "live"; clientId: string; secret: string };

export async function getPayPalConfig(): Promise<PayPalConfig> {
  const envFromDb = (await read("PAYPAL_ENV")) || process.env.PAYPAL_ENV || process.env.NEXT_PUBLIC_PAYPAL_ENV || "sandbox";
  const env = envFromDb === "live" ? "live" : "sandbox";

  // Choisir les clés selon l'env
  let clientId = "";
  let secret = "";
  if (env === "live") {
    clientId = (await read("PAYPAL_LIVE_CLIENT_ID")) || process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
    secret = (await read("PAYPAL_LIVE_SECRET")) || process.env.PAYPAL_SECRET || "";
  } else {
    clientId = (await read("PAYPAL_SANDBOX_CLIENT_ID")) || process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
    secret = (await read("PAYPAL_SANDBOX_SECRET")) || process.env.PAYPAL_SECRET || "";
  }
  return { env, clientId, secret };
}

export type StripeConfig = { secretKey: string; publishableKey: string; webhookSecret: string };

export async function getStripeConfig(): Promise<StripeConfig> {
  const secretKey = (await read("STRIPE_SECRET_KEY")) || process.env.STRIPE_SECRET_KEY || "";
  const publishableKey = (await read("STRIPE_PUBLISHABLE_KEY")) || process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const webhookSecret = (await read("STRIPE_WEBHOOK_SECRET")) || process.env.STRIPE_WEBHOOK_SECRET || "";
  return { secretKey, publishableKey, webhookSecret };
}

export async function getPublicConfig() {
  const pp = await getPayPalConfig();
  const stripe = await getStripeConfig();
  const discordUrl = (await read("DISCORD_URL")) || process.env.DISCORD_URL || "";
  // Important: lire MAINTENANCE_MODE sans cache pour bascule immédiate
  const maintenanceRaw = (await readDirect("MAINTENANCE_MODE")) || process.env.MAINTENANCE_MODE || "off";
  const maintenance = /^(1|true|on)$/i.test(String(maintenanceRaw));

  // Contest related settings
  const contestTitle = (await read("CONTEST_TITLE" as any)) || null;
  const contestImageUrl = (await read("CONTEST_IMAGE_URL" as any)) || null;
  const contestBgColor = (await read("CONTEST_BG_COLOR" as any)) || null;
  const contestFooterText = (await read("CONTEST_FOOTER_TEXT" as any)) || null;

  return { 
    paypalEnv: pp.env, 
    paypalClientId: pp.clientId, 
    stripePublishableKey: stripe.publishableKey,
    discordUrl, 
    maintenance, 
    contest: { title: contestTitle, imageUrl: contestImageUrl, bgColor: contestBgColor, footerText: contestFooterText } 
  };
}

// Utilitaire côté serveur (RSC) sans passer par API
export async function getPublicConfigServer() {
  return getPublicConfig();
}
