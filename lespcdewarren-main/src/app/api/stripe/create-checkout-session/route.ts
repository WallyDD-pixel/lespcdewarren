export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripeInstance } from "@/lib/stripe";
import { pickShippingRate } from "@/lib/shipping";
import { toISO2 } from "@/lib/shipping";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { items, shipping, shippingMethodId, email, isMarketplace, listingId } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    if (!shipping || !shippingMethodId) {
      return NextResponse.json({ error: "Adresse et mode de livraison requis" }, { status: 400 });
    }

    // Calculer le montant total
    let amountCents = 0;
    if (isMarketplace && listingId) {
      amountCents = items.reduce((sum: number, item: any) => sum + (item.priceCents || 0), 0);
    } else {
      amountCents = items.reduce((sum: number, item: any) => sum + (item.priceCents || 0) * (item.quantity || 1), 0);
    }

    // Ajouter les frais de livraison
    const chosen = pickShippingRate(
      { country: shipping.country, zip: shipping.zip, city: shipping.city },
      amountCents,
      shippingMethodId
    );

    const totalAmountCents = amountCents + (chosen.priceCents || 0);

    // R├®cup├®rer les produits depuis la DB pour les descriptions
    const productIds = Array.from(new Set(items.map((i: any) => Number(i.productId)).filter(Boolean)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const byId = new Map(products.map((p) => [p.id, p] as const));

    // Construire les line items pour Stripe Checkout
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

    for (const it of items) {
      const pid = Number(it.productId);
      const qty = Math.max(1, Number(it.quantity || 1));
      const product = byId.get(pid);
      if (!product) continue;

      let price = product.priceCents;
      if (it.variantId != null) {
        const vid = Number(it.variantId);
        const variant = product.variants.find((v) => v.id === vid);
        if (variant) price = variant.priceCents;
      }

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: price,
        },
        quantity: qty,
      });
    }

    // Ajouter les frais de livraison comme line item
    if (chosen.priceCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `Livraison - ${chosen.label}`,
          },
          unit_amount: chosen.priceCents,
        },
        quantity: 1,
      });
    }

    const stripe = await getStripeInstance();
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";

    // Cr├®er la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?canceled=true`,
      customer_email: email,
      shipping_address_collection: {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      },
      metadata: {
        isMarketplace: String(isMarketplace || false),
        listingId: listingId ? String(listingId) : "",
        shippingMethodId: shippingMethodId,
        cart: JSON.stringify(items),
        shippingName: shipping.name || "",
        shippingAddr1: shipping.addr1 || "",
        shippingAddr2: shipping.addr2 || "",
        shippingZip: shipping.zip || "",
        shippingCity: shipping.city || "",
        shippingCountry: shipping.country || "",
        shippingPhone: shipping.phone || "",
        customerEmail: email,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (e: any) {
    console.error("Erreur cr├®ation Checkout Session:", e);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
