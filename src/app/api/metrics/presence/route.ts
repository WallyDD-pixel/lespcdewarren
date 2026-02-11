import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { beat, snapshot } from "@/lib/presence";

export async function GET(req: NextRequest) {
  const session = await getSession();
  // Use an IP + UA hash as anonymous key (simple, not perfect)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "";
  const key = `${ip}|${ua.slice(0, 64)}`;

  beat(key, session.user?.id);
  const snap = snapshot();
  return NextResponse.json({ ok: true, ...snap });
}
