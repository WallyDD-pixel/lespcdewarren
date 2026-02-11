import { prisma } from "./prisma";

// Détecter si le client Prisma expose un modèle Setting (selon le schéma/migrations)
function hasSettingModel() {
  return Boolean((prisma as any)?.setting);
}

async function settingTableExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe(
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
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Setting" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT, "updatedAt" DATETIME NOT NULL)'
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Retourne le prochain numéro de facture et incrémente un compteur stocké en base (table Setting).
 * - key: clé du compteur (ex: "store_invoice_counter" ou "mp_invoice_counter")
 * - prefix: préfixe (ex: "LPDW")
 * - startAt: première valeur (ex: 1000)
 */
export async function nextInvoiceNumber(key: string, prefix: string, startAt = 1000): Promise<string> {
  const next = await prisma.$transaction(async (tx: { $queryRawUnsafe: (arg0: string, arg1: string) => any; $executeRawUnsafe: (arg0: string, arg1: string, arg2: string) => any; }) => {
    if (hasSettingModel()) {
      const s = await (tx as any).setting.findUnique({ where: { key } });
      let current = s?.value ? parseInt(s.value as string, 10) : startAt - 1;
      if (Number.isNaN(current)) current = startAt - 1;
      const n = current + 1;
      await (tx as any).setting.upsert({
        where: { key },
        update: { value: String(n), updatedAt: new Date() },
        create: { key, value: String(n), updatedAt: new Date() },
      });
      return n;
    } else {
      // Fallback SQLite brut si le modèle Setting n'existe pas dans Prisma
      await ensureSettingTable();
      const rows = await tx.$queryRawUnsafe(
        `SELECT value FROM Setting WHERE key = ? LIMIT 1`,
        key
      );
      let current = rows?.[0]?.value != null ? parseInt(String(rows[0].value), 10) : startAt - 1;
      if (Number.isNaN(current)) current = startAt - 1;
      const n = current + 1;
      await tx.$executeRawUnsafe(
        `INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=CURRENT_TIMESTAMP`,
        key,
        String(n)
      );
      return n;
    }
  });

  return `${prefix}${next}`;
}
