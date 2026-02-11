export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { paypalCreateOrder, paypalCaptureOrder } from "@/lib/paypal";
import { pickShippingRate, toISO2 } from "@/lib/shipping";
import { generateInvoicePdf } from "@/lib/invoice";
import { nextInvoiceNumber } from "@/lib/invoiceCounter";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail, buildVioletOrderEmail } from "@/lib/emailTemplates";
import { notifyAdmins } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { listingId, method, returnUrl, cancelUrl, shippingMethodId, shipping } = await req.json();
  if (!listingId || !method) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
  if (!listing || listing.status !== "PUBLISHED") return NextResponse.json({ error: "Annonce indisponible" }, { status: 400 });
  if (listing.sellerId === session.user.id) return NextResponse.json({ error: "Impossible d'acheter votre propre annonce" }, { status: 400 });

  // IN_PERSON: on crée la commande et on notifie
  if (method === "IN_PERSON") {
    // Réserver et créer la commande tout de suite
    const reserve = await prisma.listing.updateMany({ where: { id: listing.id, status: "PUBLISHED" }, data: { status: "RESERVED" } });
    if (reserve.count === 0) return NextResponse.json({ error: "Annonce indisponible" }, { status: 400 });

    // Calcul livraison éventuelle
    let shippingCostCents = 0; let shippingLabel: string | undefined;
    const addr = shipping ? { country: shipping.country, zip: shipping.zip, city: shipping.city } : null;
    if (addr) { const rate = pickShippingRate(addr as any, listing.priceCents, shippingMethodId); shippingCostCents = rate.priceCents; shippingLabel = rate.label; }

    const order = await prisma.marketplaceOrder.create({
      data: {
        listingId: listing.id,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amountCents: listing.priceCents + shippingCostCents,
        currency: listing.currency,
        paymentMethod: "IN_PERSON",
        status: "IN_PERSON_SCHEDULED",
      },
    });

    try {
      const to = session.user.email;
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const html = buildVioletOrderEmail({
        siteUrl,
        orderNo: order.id,
        currency: listing.currency,
        items: [{ name: listing.title, quantity: 1, priceCents: listing.priceCents }],
        subtotalCents: listing.priceCents,
        shippingCents: shippingCostCents,
        shipping: shipping ? { name: shipping.name, addr1: shipping.addr1, zip: shipping.zip, city: shipping.city, country: shipping.country } : undefined,
        paymentMethod: 'En personne',
        supportEmail: process.env.SUPPORT_EMAIL || 'contact@lespcdewarren.fr',
        brandName: 'Lespcdewarren',
      });
      await sendMail({ to, subject: `Commande marketplace #${order.id} reçue`, html });
    } catch {}

    notifyAdmins({ type: "ORDER_EVENT", title: "Nouvelle commande marketplace", message: `Commande #${order.id} créée pour "${listing.title}"`, link: "/admin/orders", emailSubject: `Nouvelle commande marketplace #${order.id}` }).catch(() => {});

    return NextResponse.json({ ok: true, orderId: order.id, shipping: { label: shippingLabel, priceCents: shippingCostCents } });
  }

  // PAYPAL_ONLINE: on NE crée PAS la commande ici.
  // On renvoie seulement un orderId PayPal via l’endpoint séparé /api/marketplace/paypal/create
  try {
    const countryCode = toISO2(shipping?.country || "") || "FR";
    const payload: any = {
      intent: "CAPTURE",
      purchase_units: [
        {
          description: `Marketplace: ${listing.title}`,
          amount: {
            currency_code: listing.currency,
            value: ((listing.priceCents + 0) / 100).toFixed(2),
          },
          shipping: shipping
            ? {
                name: { full_name: shipping.name || "" },
                address: { address_line_1: shipping.addr1 || "", address_line_2: shipping.addr2 || "", admin_area_2: shipping.city || "", postal_code: shipping.zip || "", country_code: countryCode },
              }
            : undefined,
        },
      ],
      application_context: { shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING" },
    };
    const pp = await paypalCreateOrder(payload);
    return NextResponse.json({ ok: true, paypalOrderId: pp.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Création PayPal échouée" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { listingId, paypalOrderId, shippingMethodId, shipping, isPayLater } = await req.json();
  if (!listingId || !paypalOrderId) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  // Recharger l’annonce et vérifier qu’elle est toujours en vente
  const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  if (listing.status !== "PUBLISHED" && listing.status !== "RESERVED") return NextResponse.json({ error: "Annonce indisponible" }, { status: 400 });
  if (listing.sellerId === session.user.id) return NextResponse.json({ error: "Impossible d'acheter votre propre annonce" }, { status: 400 });

  // Capture PayPal
  const cap = await paypalCaptureOrder(paypalOrderId);
  const captureId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  const status = cap?.status || cap?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
  if (status !== "COMPLETED") return NextResponse.json({ error: "Paiement non confirmé" }, { status: 400 });

  // Calcul livraison revalidé
  let shippingCostCents = 0;
  const addr = shipping ? { country: shipping.country, zip: shipping.zip, city: shipping.city } : null;
  if (addr) {
    const rate = pickShippingRate(addr as any, listing.priceCents, shippingMethodId);
    shippingCostCents = rate.priceCents;
  }

  // Réservation atomique au moment de la capture + création commande + passage SOLD
  // Evite toute commande avant paiement effectif
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.listing.updateMany({ where: { id: listing.id, status: "PUBLISHED" }, data: { status: "RESERVED" } });
    if (updated.count === 0 && listing.status === "PUBLISHED") {
      throw new Error("Annonce déjà indisponible");
    }
    const order = await tx.marketplaceOrder.create({
      data: {
        listingId: listing.id,
        buyerId: session.user!.id,
        sellerId: listing.sellerId,
        amountCents: listing.priceCents + shippingCostCents,
        currency: listing.currency,
        paymentMethod: isPayLater ? "PAYPAL_ONLINE_4X" : "PAYPAL_ONLINE_1X",
        status: "PAID",
        paypalOrderId,
        paypalCaptureId: captureId,
      },
    });
    await tx.listing.update({ where: { id: listing.id }, data: { status: "SOLD" } });
    return order;
  });

  const order = result;

  // Emails + facture
  let mailed = false;
  let invoiceNumber: string | null = null;
  try {
  const prefix = process.env.INVOICE_PREFIX || "LPDW";
  const startAt = Number(process.env.INVOICE_START_AT || 1500);
  invoiceNumber = await nextInvoiceNumber("mp_invoice_counter", prefix, startAt);
    const pdf = await generateInvoicePdf({
      invoiceNumber,
      company: { name: process.env.COMPANY_NAME || "lespcdewarren.fr", address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
      customer: { name: session.user.name || session.user.email, email: session.user.email },
      currency: order.currency,
      items: [{ description: `Marketplace: ${listing.title}`, quantity: 1, unitPriceCents: listing.priceCents }],
      shippingCents: shippingCostCents,
      notes: "Merci pour votre achat !",
    });

    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
    const html = buildVioletOrderEmail({
      siteUrl,
      orderNo: invoiceNumber || String(order.id),
      currency: order.currency,
      items: [{ name: `Marketplace: ${listing.title}`, quantity: 1, priceCents: listing.priceCents }],
      subtotalCents: listing.priceCents,
      shippingCents: shippingCostCents,
      paymentMethod: 'PayPal',
      supportEmail: process.env.SUPPORT_EMAIL || 'contact@lespcdewarren.fr',
      brandName: 'Lespcdewarren',
    });

    const msgId = await sendMail({ to: session.user.email, subject: `Votre reçu ${invoiceNumber}`, html, attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }], bcc: process.env.ACCOUNTING_BCC });
    mailed = !!msgId;

    await (prisma as any).marketplaceOrder.update({ where: { id: order.id }, data: { invoiceNumber, invoiceSentAt: new Date(), invoiceCustomerName: session.user.name || session.user.email } });

    // Notifier le vendeur
    try {
      const seller = await prisma.user.findUnique({ where: { id: listing.sellerId } });
      if (seller?.email) {
        const title = "Votre article a été vendu";
        const amountStr = ((order.amountCents) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
        const htmlSeller = buildNotificationEmail({ siteUrl, title, message: `Votre article "${listing.title}" a été vendu pour ${amountStr} ${order.currency}.`, ctaHref: "/marketplace/seller/dashboard", ctaLabel: "Ouvrir le tableau de bord" });
        await sendMail({ to: seller.email, subject: `${title} – ${listing.title}`, html: htmlSeller });
      }
    } catch {}
  } catch (err) {
    console.warn("[mp-invoice-email] échec d'envoi:", err);
  }

  notifyAdmins({ type: "ORDER_EVENT", title: "Commande marketplace payée", message: `Commande #${invoiceNumber || order.id} (\"${listing.title}\") – ${(order.amountCents/100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${order.currency}`, link: "/admin/orders", emailSubject: `Commande marketplace payée #${invoiceNumber || order.id}` }).catch(() => {});

  return NextResponse.json({ ok: true, mailed, invoiceNumber, orderId: order.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let orderId: number | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    orderId = Number(body?.orderId);
  } catch {}
  if (!orderId) return NextResponse.json({ error: "orderId requis" }, { status: 400 });

  const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId }, include: { listing: true } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "Annulation impossible (statut)" }, { status: 400 });

  await prisma.$transaction([
    prisma.marketplaceOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
    ...(order.listing?.status === "RESERVED" ? [prisma.listing.update({ where: { id: order.listingId }, data: { status: "PUBLISHED" } })] : []),
  ]);

  return NextResponse.json({ ok: true });
}
