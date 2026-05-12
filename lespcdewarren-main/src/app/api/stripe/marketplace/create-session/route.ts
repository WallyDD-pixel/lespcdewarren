export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripeInstance } from "@/lib/stripe";
import { getSession } from "@/lib/session";
import { pickShippingRate, toISO2 } from "@/lib/shipping";
import { prisma } from "@/lib/prisma";

// Crée une session Stripe Checkout pour une commande marketplace
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listingId, shippingMethodId, shipping } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "listingId requis" }, { status: 400 });
    }

    // Récupérer l'annonce
    const listing = await prisma.listing.findUnique({
      where: { id: Number(listingId) },
      include: { images: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
    }

    if (listing.status !== "PUBLISHED" && listing.status !== "RESERVED") {
      return NextResponse.json({ error: "Annonce indisponible" }, { status: 400 });
    }

    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "Impossible d'acheter votre propre annonce" }, { status: 400 });
    }

    // Calculer les frais de livraison
    let shippingCostCents = 0;
    const countryCode = toISO2(shipping?.country || "") || "FR";
    
    if (shipping && shippingMethodId) {
      const rate = pickShippingRate(
        { country: shipping.country, zip: shipping.zip, city: shipping.city },
        listing.priceCents,
        shippingMethodId
      );
      shippingCostCents = rate.priceCents;
    }

    const totalAmountCents = listing.priceCents + shippingCostCents;

    // Construire les line items pour Stripe
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string; images?: string[] };
        unit_amount: number;
      };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: listing.title,
            description: listing.description || undefined,
            images: listing.images.length > 0 ? [listing.images[0].url] : undefined,
          },
          unit_amount: listing.priceCents,
        },
        quantity: 1,
      },
    ];

    // Ajouter les frais de livraison
    if (shippingCostCents > 0 && shippingMethodId) {
      const rate = pickShippingRate(
        { country: shipping.country, zip: shipping.zip, city: shipping.city },
        listing.priceCents,
        shippingMethodId
      );
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `Livraison - ${rate.label}`,
          },
          unit_amount: shippingCostCents,
        },
        quantity: 1,
      });
    }

    const stripe = await getStripeInstance();
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";

    // Créer la session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`,
      cancel_url: `${siteUrl}/marketplace/${listingId}?canceled=true`,
      customer_email: session.user.email,
      shipping_address_collection: shipping
        ? undefined
        : {
            allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
          },
      metadata: {
        isMarketplace: "true",
        listingId: String(listingId),
        shippingMethodId: shippingMethodId || "",
        shippingName: shipping?.name || "",
        shippingAddr1: shipping?.addr1 || "",
        shippingAddr2: shipping?.addr2 || "",
        shippingZip: shipping?.zip || "",
        shippingCity: shipping?.city || "",
        shippingCountry: shipping?.country || "",
        shippingPhone: shipping?.phone || "",
        buyerId: String(session.user.id),
        sellerId: String(listing.sellerId),
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (e: any) {
    console.error("[Stripe Marketplace Create Session] Erreur:", e);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}

