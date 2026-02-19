export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickShippingRate } from "@/lib/shipping";

/**
 * Crée une commande boutique en "paiement sur place" (espèces / virement instantané).
 * Pas de redirection Stripe ; statut PENDING, contact client stocké dans invoiceNotes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items: rawItems,
      shipping,
      shippingMethodId,
      email,
      customerInstagram,
      customerSnapchat,
    } = body;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }
    if (!shipping || !shippingMethodId || !email) {
      return NextResponse.json({ error: "Adresse, livraison et email requis" }, { status: 400 });
    }

    const sessionUser = await getSession();

    const productIds = Array.from(new Set(rawItems.map((i: any) => Number(i.productId)).filter(Boolean)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const byId = new Map(products.map((p) => [p.id, p] as const));
    const variantById = new Map<number, { productId: number; stock: number; name: string }>();
    for (const p of products) {
      for (const v of p.variants) {
        variantById.set(v.id, { productId: p.id, stock: v.stock, name: v.name });
      }
    }

    let amountCents = 0;
    const orderItemsData: Array<{
      product: { connect: { id: number } };
      variant?: { connect: { id: number } };
      quantity: number;
      priceCents: number;
    }> = [];

    const productDec = new Map<number, number>();
    const variantDec = new Map<number, number>();

    for (const it of rawItems) {
      const pid = Number(it.productId);
      const qty = Math.max(1, Number(it.quantity || 1));
      if (!pid || !Number.isFinite(pid)) {
        return NextResponse.json({ error: "Item invalide (productId manquant)" }, { status: 400 });
      }
      const product = byId.get(pid);
      if (!product) {
        return NextResponse.json({ error: `Produit introuvable (${pid})` }, { status: 400 });
      }

      let price = product.priceCents;
      let variantConnect: { connect: { id: number } } | undefined;
      if (it.variantId != null) {
        const vid = Number(it.variantId);
        const variant = product.variants.find((v) => v.id === vid);
        if (!variant) {
          return NextResponse.json({ error: `Variante introuvable (${vid})` }, { status: 400 });
        }
        price = variant.priceCents;
        variantConnect = { connect: { id: vid } };
        variantDec.set(vid, (variantDec.get(vid) || 0) + qty);
      } else {
        productDec.set(pid, (productDec.get(pid) || 0) + qty);
      }

      amountCents += price * qty;
      orderItemsData.push({
        product: { connect: { id: pid } },
        variant: variantConnect,
        quantity: qty,
        priceCents: price,
      });
    }

    for (const [pid, need] of productDec.entries()) {
      const p = byId.get(pid);
      if (!p) return NextResponse.json({ error: `Produit ${pid} introuvable` }, { status: 400 });
      if (p.stock < need) {
        return NextResponse.json(
          { error: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock}, demandé: ${need})` },
          { status: 400 }
        );
      }
    }
    for (const [vid, need] of variantDec.entries()) {
      const v = variantById.get(vid);
      if (!v) return NextResponse.json({ error: `Variante ${vid} introuvable` }, { status: 400 });
      if (v.stock < need) {
        const parent = byId.get(v.productId);
        return NextResponse.json(
          {
            error: `Stock insuffisant pour la variante${parent ? ` de "${parent.name}"` : ""} (disponible: ${v.stock}, demandé: ${need})`,
          },
          { status: 400 }
        );
      }
    }

    const chosen = pickShippingRate(
      { country: shipping.country, zip: shipping.zip, city: shipping.city },
      amountCents,
      shippingMethodId
    );

    const contactParts: string[] = [];
    if (customerInstagram) contactParts.push(`Instagram: ${customerInstagram.trim()}`);
    if (customerSnapchat) contactParts.push(`Snapchat: ${customerSnapchat.trim()}`);
    const contactLine = contactParts.length ? contactParts.join(" · ") : "Non renseigné";
    const invoiceNotes = `Paiement sur place (espèces / virement instantané). Contact client: ${contactLine}`;

    const failStock = (m: string) => {
      throw new Error(`OUT_OF_STOCK:${m}`);
    };

    const order = await prisma.$transaction(async (tx) => {
      for (const [vid, dec] of variantDec.entries()) {
        const res = await tx.variant.updateMany({
          where: { id: vid, stock: { gte: dec } },
          data: { stock: { decrement: dec } },
        });
        if (res.count === 0) {
          const v = variantById.get(vid);
          const parent = v ? byId.get(v.productId) : undefined;
          failStock(`Variante${parent ? ` de "${parent.name}"` : ""}`);
        }
      }
      for (const [pid, dec] of productDec.entries()) {
        const res = await tx.product.updateMany({
          where: { id: pid, stock: { gte: dec } },
          data: { stock: { decrement: dec } },
        });
        if (res.count === 0) {
          const p = byId.get(pid);
          failStock(`"${p?.name ?? pid}"`);
        }
      }

      return tx.order.create({
        data: {
          email,
          userId: sessionUser?.user?.id ?? undefined,
          amountCents: amountCents + (chosen.priceCents || 0),
          currency: "EUR",
          status: "PENDING",
          shippingName: shipping.name,
          shippingAddr1: shipping.addr1,
          shippingAddr2: shipping.addr2 || undefined,
          shippingZip: shipping.zip,
          shippingCity: shipping.city,
          shippingMethod: chosen.id,
          shippingCostCents: chosen.priceCents || 0,
          invoiceNotes,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      redirectUrl: "/success?onsite=1",
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: msg.replace("OUT_OF_STOCK:", "") }, { status: 400 });
    }
    console.error("[create-onsite]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
