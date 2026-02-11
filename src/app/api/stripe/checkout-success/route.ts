export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripeInstance } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickShippingRate } from "@/lib/shipping";
import { generateInvoicePdf } from "@/lib/invoice";
import { nextInvoiceNumber } from "@/lib/invoiceCounter";
import { sendMail } from "@/lib/mail";
import { buildStyledOrderEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId manquant" }, { status: 400 });
    }

    const stripe = await getStripeInstance();
    
    // R├®cup├®rer la session Stripe Checkout
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    // V├®rifier que le paiement est r├®ussi
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Paiement non confirm├®" }, { status: 400 });
    }

    // V├®rifier l'idempotence (├®viter les doublons)
    const trKey = `stripe:${sessionId}`;
    const already = await prisma.order.findFirst({ where: { trackingUrl: trKey } });
    if (already) {
      return NextResponse.json({ ok: true, id: already.id });
    }

    // R├®cup├®rer les m├®tadonn├®es de la session
    const metadata = session.metadata || {};
    console.log("[Stripe Checkout Success] M├®tadonn├®es de la session:", JSON.stringify(metadata, null, 2));
    
    const isMarketplace = metadata?.isMarketplace === "true";
    const listingId = metadata?.listingId ? Number(metadata.listingId) : null;
    const shippingMethodId = metadata?.shippingMethodId || "";
    
    let rawItems: any[] = [];
    try {
      rawItems = metadata?.cart ? JSON.parse(metadata.cart) : [];
      console.log("[Stripe Checkout Success] Items pars├®s:", JSON.stringify(rawItems, null, 2));
    } catch (e) {
      console.error("[Stripe Checkout Success] Erreur parsing cart:", e);
      return NextResponse.json({ error: "Format du panier invalide dans les m├®tadonn├®es" }, { status: 400 });
    }
    
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      console.error("[Stripe Checkout Success] Panier vide ou invalide");
      return NextResponse.json({ error: "Panier vide ou invalide" }, { status: 400 });
    }
    
    const customerEmail = session.customer_email || metadata?.customerEmail || "unknown@example.com";

    // Utiliser les métadonnées en priorité, puis les détails de la session si disponibles
    const sessionShipping = (session as any).shipping_details || null;
    const shipping = {
      name: metadata?.shippingName || sessionShipping?.name || "",
      addr1: metadata?.shippingAddr1 || sessionShipping?.address?.line1 || "",
      addr2: metadata?.shippingAddr2 || sessionShipping?.address?.line2 || "",
      zip: metadata?.shippingZip || sessionShipping?.address?.postal_code || "",
      city: metadata?.shippingCity || sessionShipping?.address?.city || "",
      country: metadata?.shippingCountry || sessionShipping?.address?.country || "",
      phone: metadata?.shippingPhone || sessionShipping?.phone || "",
    };

    if (isMarketplace && listingId) {
      // TODO: Impl├®menter la logique marketplace compl├¿te
      return NextResponse.json({ error: "Marketplace non encore impl├®ment├® avec Stripe Checkout" }, { status: 400 });
    }

    // Session user
    const sessionUser = await getSession();

    // Validation et construction des items depuis la DB
    const productIds = Array.from(new Set(rawItems.map((i: any) => Number(i.productId)).filter(Boolean)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true, images: true },
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
        console.error("[Stripe Checkout Success] Item invalide (pas de productId):", it);
        return NextResponse.json({ error: `Item invalide: productId manquant ou invalide` }, { status: 400 });
      }
      
      const product = byId.get(pid);
      if (!product) {
        console.error(`[Stripe Checkout Success] Produit introuvable: ${pid}`);
        return NextResponse.json({ error: `Produit introuvable (${pid})` }, { status: 400 });
      }

      let price = product.priceCents;
      let variantConnect: { connect: { id: number } } | undefined = undefined;
      if (it.variantId != null) {
        const vid = Number(it.variantId);
        const variant = product.variants.find((v) => v.id === vid);
        if (!variant) return NextResponse.json({ error: `Variante introuvable (${vid}) pour le produit ${pid}` }, { status: 400 });
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
      if (p.stock < need) return NextResponse.json({ error: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock}, demand├®: ${need})` }, { status: 400 });
    }
    for (const [vid, need] of variantDec.entries()) {
      const v = variantById.get(vid);
      if (!v) return NextResponse.json({ error: `Variante ${vid} introuvable` }, { status: 400 });
      if (v.stock < need) {
        const parent = byId.get(v.productId);
        return NextResponse.json({ error: `Stock insuffisant pour la variante (disponible: ${v.stock}, demand├®: ${need})${parent ? ` de "${parent.name}"` : ""}` }, { status: 400 });
      }
    }

    const chosen = pickShippingRate({ country: shipping?.country, zip: shipping?.zip, city: shipping?.city }, amountCents, shippingMethodId);

    const failStock = (m: string) => { throw new Error(`OUT_OF_STOCK:${m}`); };

    const created = await prisma.$transaction(async (tx) => {
      for (const [vid, dec] of variantDec.entries()) {
        const res = await tx.variant.updateMany({ where: { id: vid, stock: { gte: dec } }, data: { stock: { decrement: dec } } });
        if (res.count === 0) {
          const v = variantById.get(vid);
          const parent = v ? byId.get(v.productId) : undefined;
          failStock(`Stock insuffisant pour la variante${parent ? ` de "${parent.name}"` : ""}`);
        }
      }
      for (const [pid, dec] of productDec.entries()) {
        const res = await tx.product.updateMany({ where: { id: pid, stock: { gte: dec } }, data: { stock: { decrement: dec } } });
        if (res.count === 0) {
          const p = byId.get(pid);
          failStock(`Stock insuffisant pour "${p?.name ?? pid}"`);
        }
      }

      const order = await tx.order.create({
        data: {
          email: customerEmail,
          userId: sessionUser?.user?.id,
          amountCents: amountCents + (chosen.priceCents || 0),
          currency: "EUR",
          status: "PAYMENT_RECEIVED",
          trackingUrl: trKey,
          shippingName: shipping?.name,
          shippingAddr1: shipping?.addr1,
          shippingAddr2: shipping?.addr2,
          shippingZip: shipping?.zip,
          shippingCity: shipping?.city,
          shippingMethod: chosen.id,
          shippingCostCents: chosen.priceCents || 0,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
      return order;
    });

    // G├®n├®rer et envoyer la facture par email
    let mailed = false;
    let invNo: string | null = null;
    try {
      const prefix = process.env.INVOICE_PREFIX || "LPDW";
      const startAt = Number(process.env.INVOICE_START_AT || 1500);
      invNo = await nextInvoiceNumber("store_invoice_counter", prefix, startAt);

      const itemsForPdf = await Promise.all(created.items.map(async (it) => {
        const p = byId.get(it.productId) || await prisma.product.findUnique({ where: { id: it.productId } });
        const desc = p?.name || `Produit #${it.productId}`;
        return { description: desc, quantity: it.quantity, unitPriceCents: it.priceCents };
      }));

      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber: invNo,
        company: { name: process.env.COMPANY_NAME || "lespcdewarren.fr", address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
        customer: { name: created.shippingName || created.email, email: created.email, address1: created.shippingAddr1 || undefined, zip: created.shippingZip || undefined, city: created.shippingCity || undefined },
        currency: created.currency,
        items: itemsForPdf,
        shippingCents: created.shippingCostCents || 0,
        notes: "Merci pour votre achat !",
      });

      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const itemsForEmail = created.items.map((it) => {
        const p = byId.get(it.productId);
        const name = p?.name || `Produit #${it.productId}`;
        const rawUrl = p?.images?.[0]?.url || '';
        let imgUrl = '';
        if (rawUrl) imgUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `${siteUrl.replace(/\/$/, '')}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
        return { name, quantity: it.quantity, priceCents: it.priceCents, imageUrl: imgUrl };
      });

      const subtotal = created.items.reduce((s, it) => s + it.priceCents * it.quantity, 0);

      const updated = await prisma.order.updateMany({ where: { id: created.id, invoiceSentAt: null }, data: {
        invoiceNumber: invNo,
        invoiceSentAt: new Date(),
        invoiceCustomerName: created.shippingName || created.email,
        invoiceCustomerAddr1: created.shippingAddr1,
        invoiceCustomerZip: created.shippingZip,
        invoiceCustomerCity: created.shippingCity,
      }});

      if (updated.count === 1) {
        const html = buildStyledOrderEmail({
          siteUrl,
          orderNo: invNo || String(created.id),
          currency: created.currency || 'EUR',
          items: itemsForEmail,
          subtotalCents: subtotal,
          shippingCents: created.shippingCostCents || 0,
          shipping: { name: created.shippingName || undefined, addr1: created.shippingAddr1 || undefined, zip: created.shippingZip || undefined, city: created.shippingCity || undefined, country: 'France' },
          billing: { name: created.shippingName || undefined, addr1: created.shippingAddr1 || undefined, zip: created.shippingZip || undefined, city: created.shippingCity || undefined, country: 'France' },
          supportEmail: process.env.SUPPORT_EMAIL || undefined,
          brandName: process.env.COMPANY_NAME || undefined,
        });

        const subject = `Votre facture ${invNo} ÔÇô Commande #${invNo}`;
        const msgId = await sendMail({ to: created.email, subject, html, attachments: [{ filename: `${invNo}.pdf`, content: pdfBuffer, contentType: "application/pdf" }], bcc: process.env.ACCOUNTING_BCC });
        mailed = !!msgId;
      } else {
        mailed = false;
      }
    } catch (err) {
      console.warn("[invoice-email] ├®chec d'envoi:", err);
    }

    return NextResponse.json({ ok: true, id: created.id, mailed, invoiceNumber: invNo });
  } catch (e: any) {
    if (e instanceof Error && e.message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: e.message.slice("OUT_OF_STOCK:".length) }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
