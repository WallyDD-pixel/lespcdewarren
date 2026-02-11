import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Stripe supprimée. Aucun setup intent requis." }, { status: 410 });
}
