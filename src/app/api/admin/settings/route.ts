import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSettings, setSettings, type SettingKey } from "@/lib/settings";

const PUBLIC_KEYS: SettingKey[] = [
  "PAYPAL_ENV",
  "PAYPAL_SANDBOX_CLIENT_ID",
  "PAYPAL_LIVE_CLIENT_ID",
  "DISCORD_URL",
];

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = await getSettings([
    "PAYPAL_ENV",
    "PAYPAL_SANDBOX_CLIENT_ID",
    "PAYPAL_SANDBOX_SECRET",
    "PAYPAL_LIVE_CLIENT_ID",
    "PAYPAL_LIVE_SECRET",
    "DISCORD_URL",
    "MAINTENANCE_MODE",
  "CONTEST_TITLE",
  "CONTEST_IMAGE_URL",
  "CONTEST_BG_COLOR",
  "CONTEST_FOOTER_TEXT",
  ]);
  return NextResponse.json({ ok: true, settings: all });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    const updates: Partial<Record<SettingKey, string | null>> = {};

    const push = (k: SettingKey, v: unknown) => {
      if (typeof v === 'string') (updates as any)[k] = v.trim();
      else if (v == null) (updates as any)[k] = null;
      else (updates as any)[k] = String(v);
    };

    if ("PAYPAL_ENV" in body) {
      const env = String(body.PAYPAL_ENV).toLowerCase();
      if (env !== 'sandbox' && env !== 'live') return NextResponse.json({ error: "PAYPAL_ENV doit être 'sandbox' ou 'live'" }, { status: 400 });
      push("PAYPAL_ENV", env);
    }
    if ("PAYPAL_SANDBOX_CLIENT_ID" in body) push("PAYPAL_SANDBOX_CLIENT_ID", body.PAYPAL_SANDBOX_CLIENT_ID);
    if ("PAYPAL_SANDBOX_SECRET" in body) push("PAYPAL_SANDBOX_SECRET", body.PAYPAL_SANDBOX_SECRET);
    if ("PAYPAL_LIVE_CLIENT_ID" in body) push("PAYPAL_LIVE_CLIENT_ID", body.PAYPAL_LIVE_CLIENT_ID);
    if ("PAYPAL_LIVE_SECRET" in body) push("PAYPAL_LIVE_SECRET", body.PAYPAL_LIVE_SECRET);

    if ("DISCORD_URL" in body) {
      const raw = (typeof body.DISCORD_URL === 'string' ? body.DISCORD_URL.trim() : String(body.DISCORD_URL || ''));
      if (raw === '') {
        updates.DISCORD_URL = null;
      } else {
        try {
          const u = new URL(raw);
          if (!/^https?:$/.test(u.protocol)) return NextResponse.json({ error: "URL Discord invalide (http/https requis)" }, { status: 400 });
          updates.DISCORD_URL = u.toString();
        } catch {
          return NextResponse.json({ error: "URL Discord invalide" }, { status: 400 });
        }
      }
    }

    if ("MAINTENANCE_MODE" in body) {
      const raw = String(body.MAINTENANCE_MODE ?? "off");
      const norm = /^(1|true|on)$/i.test(raw) ? "on" : "off";
      updates.MAINTENANCE_MODE = norm;
    }

  // Contest card settings
  if ("CONTEST_TITLE" in body) push("CONTEST_TITLE" as any, body.CONTEST_TITLE);
  if ("CONTEST_IMAGE_URL" in body) push("CONTEST_IMAGE_URL" as any, body.CONTEST_IMAGE_URL);
  if ("CONTEST_BG_COLOR" in body) push("CONTEST_BG_COLOR" as any, body.CONTEST_BG_COLOR);
  if ("CONTEST_FOOTER_TEXT" in body) push("CONTEST_FOOTER_TEXT" as any, body.CONTEST_FOOTER_TEXT);

    await setSettings(updates);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid payload" }, { status: 400 });
  }
}
