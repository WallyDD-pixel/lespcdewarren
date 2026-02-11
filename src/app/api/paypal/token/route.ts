import { NextResponse } from "next/server";
import { paypalGenerateClientToken } from "@/lib/paypal";

export async function GET() {
  try {
    const token = await paypalGenerateClientToken();
    return NextResponse.json({ token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur PayPal" }, { status: 500 });
  }
}
