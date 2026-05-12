import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

async function readSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function writeSettings(obj: any) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(obj, null, 2), "utf8");
}

export async function GET() {
  const s = await readSettings();
  return NextResponse.json({ ok: true, settings: s });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const s = await readSettings();
    const next = { ...s, ...body };
    await writeSettings(next);
    return NextResponse.json({ ok: true, settings: next });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
