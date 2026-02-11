import { NextRequest, NextResponse } from "next/server";
import { paypalCreateOrder } from "@/lib/paypal";
import { pickShippingRate } from "@/lib/shipping";

export async function POST(req: NextRequest) {
  try {
    const { items, shipping, cancelUrl, shippingMethodId } = await req.json();
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "Panier vide" }, { status: 400 });

    // Build purchase units from cart
    const amountItems = items.reduce((s: number, i: any) => s + (i.priceCents * i.quantity), 0);
    const chosen = pickShippingRate({ country: shipping?.country, zip: shipping?.zip, city: shipping?.city }, amountItems, shippingMethodId);
    const shippingCents = chosen.priceCents || 0;
    const totalCents = amountItems + shippingCents;

    const value = (totalCents / 100).toFixed(2);
    const item_total = (amountItems / 100).toFixed(2);
    const shipping_total = (shippingCents / 100).toFixed(2);

    const purchase_units = [
      {
        amount: {
          currency_code: "EUR",
          value,
          breakdown: {
            item_total: { currency_code: "EUR", value: item_total },
            shipping: { currency_code: "EUR", value: shipping_total },
          },
        },
        shipping: shipping?.addr1 ? {
          name: { full_name: shipping?.name || "" },
          address: {
            address_line_1: shipping?.addr1 || "",
            address_line_2: shipping?.addr2 || "",
            admin_area_2: shipping?.city || "",
            postal_code: shipping?.zip || "",
            country_code: (shipping?.country || "FR").slice(0,2).toUpperCase(),
          },
        } : undefined,
      },
    ];

    const application_context: any = {
      brand_name: "lespcdewarren",
      user_action: "PAY_NOW",
      return_url: `${process.env.SITE_URL || req.headers.get("origin") || "http://localhost:3000"}/success?provider=paypal`,
      cancel_url: cancelUrl || `${process.env.SITE_URL || req.headers.get("origin") || "http://localhost:3000"}/panier`,
    };

    const order = await paypalCreateOrder({ intent: "CAPTURE", purchase_units, application_context });

    const approve = order.links?.find((l: any) => l.rel === "approve")?.href;
    return NextResponse.json({ id: order.id, url: approve || null, shipping: { methodId: chosen.id, priceCents: shippingCents } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur PayPal" }, { status: 500 });
  }
}
