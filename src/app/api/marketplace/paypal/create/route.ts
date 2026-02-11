export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { paypalCreateOrder } from "@/lib/paypal";
import { pickShippingRate, toISO2 } from "@/lib/shipping";

// Crée uniquement une commande PayPal (pas de création en base, pas de réservation)
// On ne réservera et ne créera la commande qu'après capture réussie
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { listingId, shippingMethodId, shipping } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId requis" }, { status: 400 });

  // Calculer le montant et l'expédition à partir du listing côté client plus tard lors de la capture
  const countryCode = toISO2(shipping?.country || "") || "FR";

  const payload: any = {
    intent: "CAPTURE",
    purchase_units: [
      {
        description: `Marketplace: Listing #${listingId}`,
        amount: {
          currency_code: "EUR", // Valeur exacte confirmée à la capture
          value: "0.00", // placeholder (le montant fin sera validé côté serveur à la capture)
        },
        shipping: shipping
          ? {
              name: { full_name: shipping.name || "" },
              address: {
                address_line_1: shipping.addr1 || "",
                address_line_2: shipping.addr2 || "",
                admin_area_2: shipping.city || "",
                postal_code: shipping.zip || "",
                country_code: countryCode,
              },
            }
          : undefined,
      },
    ],
    application_context: {
      shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
    },
  };

  try {
    const created = await paypalCreateOrder(payload);
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Création PayPal échouée" }, { status: 500 });
  }
}
