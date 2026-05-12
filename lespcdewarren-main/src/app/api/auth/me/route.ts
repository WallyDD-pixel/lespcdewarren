import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const user = session?.user || null;
  return NextResponse.json({ ok: true, user });
}
