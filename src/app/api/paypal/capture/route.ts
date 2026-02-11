export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { paypalCaptureOrder, paypalGetOrder } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickShippingRate } from "@/lib/shipping";
import { generateInvoicePdf } from "@/lib/invoice";
import { nextInvoiceNumber } from "@/lib/invoiceCounter";
import { sendMail } from "@/lib/mail";
import { notifyAdmins } from "@/lib/notify";
import { buildStyledOrderEmail } from '@/lib/emailTemplates';

export async function POST(req: NextRequest) {
  try {
    const { orderId, cart, shipping, email: bodyEmail, shippingMethodId, isPayLater } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId manquant" }, { status: 400 });

    const cap = await paypalCaptureOrder(orderId);

    // Ensure paid
    const status = cap?.status || cap?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    if (status !== "COMPLETED") return NextResponse.json({ error: "Paiement non confirmé" }, { status: 400 });

    // Idempotency: if we've already recorded this PayPal order, return it
    const trKey = `paypal:${orderId}`;
    const already = await prisma.order.findFirst({ where: { trackingUrl: trKey } });
    if (already) return NextResponse.json({ ok: true, id: already.id });

    // Fetch full order for payer info (fallback email only)
    const o = await paypalGetOrder(orderId);

    // Session user
    const session = await getSession();
    const sessionUser = session?.user;

    // Determine email priority: session > body email > PayPal payer
    const email = sessionUser?.email || (typeof bodyEmail === "string" && bodyEmail) || o?.payer?.email_address || "unknown@example.com";

    // Validate and build items from DB
    const rawItems: Array<{ productId: number; variantId?: number | null; quantity: number }> = Array.isArray(cart) ? cart : [];
    if (!rawItems.length) return NextResponse.json({ error: "Panier vide" }, { status: 400 });

    const productIds = Array.from(new Set(rawItems.map((i) => Number(i.productId)).filter(Boolean)));
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { variants: true, images: true } });
    const byId = new Map(products.map((p) => [p.id, p] as const));
    // Index variants by id for quick lookup
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

    // Aggregate decrements per product / variant
    const productDec = new Map<number, number>();
    const variantDec = new Map<number, number>();

    for (const it of rawItems) {
      const pid = Number(it.productId);
      const qty = Math.max(1, Number(it.quantity || 1));
      const product = byId.get(pid);
      if (!product) return NextResponse.json({ error: `Produit introuvable (${pid})` }, { status: 400 });

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

    // Validate stock availability before committing
    for (const [pid, need] of productDec.entries()) {
      const p = byId.get(pid);
      if (!p) return NextResponse.json({ error: `Produit ${pid} introuvable` }, { status: 400 });
      if (p.stock < need) return NextResponse.json({ error: `Stock insuffisant pour "${p.name}" (disponible: ${p.stock}, demandé: ${need})` }, { status: 400 });
    }
    for (const [vid, need] of variantDec.entries()) {
      const v = variantById.get(vid);
      if (!v) return NextResponse.json({ error: `Variante ${vid} introuvable` }, { status: 400 });
      if (v.stock < need) {
        const parent = byId.get(v.productId);
        return NextResponse.json({ error: `Stock insuffisant pour la variante (disponible: ${v.stock}, demandé: ${need})${parent ? ` de "${parent.name}"` : ""}` }, { status: 400 });
      }
    }

    // Determine shipping method and cost
    const chosen = pickShippingRate({ country: shipping?.country, zip: shipping?.zip, city: shipping?.city }, amountCents, shippingMethodId);

    const failStock = (m: string) => { throw new Error(`OUT_OF_STOCK:${m}`); };

    // Decrement inventory and create Order atomically
    const created = await prisma.$transaction(async (tx) => {
      // Decrement variants first (with conditional guard)
      for (const [vid, dec] of variantDec.entries()) {
        const res = await tx.variant.updateMany({ where: { id: vid, stock: { gte: dec } }, data: { stock: { decrement: dec } } });
        if (res.count === 0) {
          const v = variantById.get(vid);
          const parent = v ? byId.get(v.productId) : undefined;
          failStock(`Stock insuffisant pour la variante${parent ? ` de "${parent.name}"` : ""}`);
        }
      }
      // Decrement products without variants (with conditional guard)
      for (const [pid, dec] of productDec.entries()) {
        const res = await tx.product.updateMany({ where: { id: pid, stock: { gte: dec } }, data: { stock: { decrement: dec } } });
        if (res.count === 0) {
          const p = byId.get(pid);
          failStock(`Stock insuffisant pour "${p?.name ?? pid}"`);
        }
      }

      // Create Order in DB
      const order = await tx.order.create({
        data: {
          email,
          userId: sessionUser?.id,
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

    // Générer et envoyer la facture par email (best-effort)
    let mailed = false;
    let invNo: string | null = null;
    try {
  const prefix = process.env.INVOICE_PREFIX || "LPDW";
  // Default start at 1500 for visible order numbers unless explicitly configured
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

      // Attempt an atomic conditional update: only set invoice metadata if invoiceSentAt not yet set.
      const updated = await prisma.order.updateMany({ where: { id: created.id, invoiceSentAt: null }, data: {
        invoiceNumber: invNo,
        invoiceSentAt: new Date(),
        invoiceCustomerName: created.shippingName || created.email,
        invoiceCustomerAddr1: created.shippingAddr1,
        invoiceCustomerZip: created.shippingZip,
        invoiceCustomerCity: created.shippingCity,
      }});

      // If we successfully updated (count === 1) we are responsible for sending the email.
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

        const subject = `Votre facture ${invNo} – Commande #${invNo}`;
        const msgId = await sendMail({ to: created.email, subject, html, attachments: [{ filename: `${invNo}.pdf`, content: pdfBuffer, contentType: "application/pdf" }], bcc: process.env.ACCOUNTING_BCC });
        mailed = !!msgId;
      } else {
        // Someone else already sent/persisted the invoice metadata -> skip sending to avoid duplicates
        mailed = false;
      }
    } catch (err) {
      console.warn("[invoice-email] échec d'envoi:", err);
    }

  // Notification admin (best-effort)
  // Désactivée suite à la demande: empêcher l'envoi automatique de la notif admin
  // notifyAdmins({
  //   type: "ORDER_EVENT",
  //   title: "Nouvelle commande boutique",
  //   message: `Commande #${created.id} payée (${(created.amountCents/100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${created.currency})`,
  //   link: "/admin/orders",
  //   emailSubject: `Nouvelle commande boutique #${created.id}`,
  // }).catch(() => {});

    return NextResponse.json({ ok: true, id: created.id, mailed, invoiceNumber: invNo });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: e.message.slice("OUT_OF_STOCK:".length) }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
