import { NextRequest, NextResponse } from "next/server";
import { getShippingRates } from "@/lib/shipping";

export async function POST(req: NextRequest) {
  try {
    const { address, cartTotalCents } = await req.json();
    if (!address || typeof cartTotalCents !== "number") return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    const rates = getShippingRates({ country: address.country, zip: address.zip, city: address.city }, Math.max(0, Math.floor(cartTotalCents)));
    return NextResponse.json({ rates });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
