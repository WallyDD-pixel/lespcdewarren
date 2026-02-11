import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/settings";

export async function GET() {
  try {
    const conf = await getPublicConfig();
    return NextResponse.json({ ok: true, ...conf });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
