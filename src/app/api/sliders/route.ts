import { NextResponse } from "next/server";
import { listPublicSliders } from "@/lib/sliders";

export async function GET() {
  const items = await listPublicSliders();
  return NextResponse.json({ ok: true, items });
}
