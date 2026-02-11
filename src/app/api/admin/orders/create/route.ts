import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { buildStyledOrderEmail } from '@/lib/emailTemplates';
import { nextInvoiceNumber } from '@/lib/invoiceCounter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
  const { firstName, lastName, productId, variantId, email, phone, options, address, zip, city } = body;
  if (!firstName || !lastName || !productId) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

  // Build minimal order record
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    const priceCents = Number(body.priceCents) || product.priceCents;

  // Reserve a human-friendly invoice/order number and persist it on creation.
  const prefix = process.env.INVOICE_PREFIX || ""; // empty by default to produce plain numbers like 1500
  const startAt = Number(process.env.INVOICE_START_AT || 1500);
  const invNo = await nextInvoiceNumber("store_invoice_counter", prefix, startAt);

  const order = await prisma.order.create({
      data: {
    invoiceNumber: invNo,
        email: email || `${lastName}.${firstName}@example.com`,
        amountCents: priceCents,
        currency: "EUR",
        status: "PENDING",
        shippingName: `${firstName} ${lastName}`,
  invoiceNotes: JSON.stringify({ options: options || null, address: address || null, zip: zip || null, city: city || null, phone: phone || null }),
        items: {
          create: [
            {
              productId: Number(productId),
              variantId: variantId ? Number(variantId) : undefined,
              quantity: 1,
              priceCents: priceCents,
            },
          ],
        },
      },
      include: { items: true },
    });

    // envoyer un mail de confirmation si possible (template stylé)
    try {
      if (email) {
        const prodName = (product as any)?.name || (product as any)?.title || 'Produit';
        const items = [{ name: prodName, quantity: 1, priceCents, imageUrl: (product as any)?.imageUrl || null }];
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
        const html = buildStyledOrderEmail({
          siteUrl,
          orderNo: order.invoiceNumber || String(order.id),
          currency: order.currency || 'EUR',
          items,
          subtotalCents: order.amountCents,
          shippingCents: 0,
          supportEmail: process.env.SUPPORT_EMAIL || undefined,
          brandName: process.env.BRAND_NAME || undefined,
        });
        await sendMail({ to: email, subject: `Confirmation de commande #${order.invoiceNumber || order.id}`, html });
      }
    } catch (mailErr: any) {
      console.warn("Échec envoi mail:", mailErr?.message || mailErr);
    }
    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    console.error("[CREATE ORDER] Erreur:", err);
    console.error("[CREATE ORDER] Stack:", err?.stack);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
