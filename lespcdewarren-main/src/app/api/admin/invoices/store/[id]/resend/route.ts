export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { generateInvoicePdf } from '@/lib/invoice';
import { nextInvoiceNumber } from '@/lib/invoiceCounter';
import { sendMail } from '@/lib/mail';
import { buildStyledOrderEmail } from '@/lib/emailTemplates';

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await getSession();
    if (!session.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    const id = Number(context.params.id);

    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { include: { images: true } } } } } });
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    const o: any = order as any;
    const prefix = process.env.INVOICE_PREFIX || 'LPDW';
    let invNo = (o.invoiceNumber as string | null) || '';
    if (!invNo) {
      const startAt = Number(process.env.INVOICE_START_AT || 1500);
      invNo = await nextInvoiceNumber('store_invoice_counter', prefix, startAt);
    }

    const items = order.items.map((it) => ({ description: it.product?.name || `Produit #${it.productId}` , quantity: it.quantity, unitPriceCents: it.priceCents }));

    const pdf = await generateInvoicePdf({
      invoiceNumber: invNo,
      company: { name: process.env.COMPANY_NAME || 'lespcdewarren.fr', address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
      customer: {
        name: (o.invoiceCustomerName as string) || order.shippingName || order.email,
        email: order.email,
        address1: (o.invoiceCustomerAddr1 as string) || order.shippingAddr1 || undefined,
        zip: (o.invoiceCustomerZip as string) || order.shippingZip || undefined,
        city: (o.invoiceCustomerCity as string) || order.shippingCity || undefined,
      },
      currency: order.currency,
      items,
      shippingCents: order.shippingCostCents || 0,
      notes: (o.invoiceNotes as string) || 'Merci pour votre achat !',
    });

    // Email aligné sur le template stylé
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lespcdewarren.fr';
    const subtotal = order.items.reduce((s, it) => s + it.priceCents * it.quantity, 0);
    const html = buildStyledOrderEmail({
      siteUrl,
      orderNo: invNo || String(order.id),
      currency: order.currency,
      items: order.items.map((it) => ({ name: it.product?.name || `Produit #${it.productId}`, quantity: it.quantity, priceCents: it.priceCents, imageUrl: it.product?.images?.[0]?.url })),
      subtotalCents: subtotal,
      shippingCents: order.shippingCostCents || 0,
      supportEmail: process.env.SUPPORT_EMAIL,
      brandName: process.env.COMPANY_NAME || 'Lespcdewarren',
      accent: '#6d28d9',
      accent2: '#8b5cf6',
    });

    await sendMail({ to: order.email, subject: `Votre facture ${invNo}` , html, attachments: [{ filename: `${invNo}.pdf`, content: pdf, contentType: 'application/pdf' }], bcc: process.env.ACCOUNTING_BCC });

    await (prisma as any).order.update({ where: { id: order.id }, data: {
      invoiceNumber: invNo,
      invoiceSentAt: new Date(),
      invoiceCustomerName: (o.invoiceCustomerName as string) || order.shippingName || order.email,
      invoiceCustomerAddr1: (o.invoiceCustomerAddr1 as string) || order.shippingAddr1 || null,
      invoiceCustomerZip: (o.invoiceCustomerZip as string) || order.shippingZip || null,
      invoiceCustomerCity: (o.invoiceCustomerCity as string) || order.shippingCity || null,
    }});

    return NextResponse.redirect(new URL('/admin/invoices', req.url), { status: 303 });
  } catch (e: any) {
    console.error('[admin:invoice:store:resend] error', e);
    return NextResponse.json({ error: e?.message || 'Erreur lors de l\'envoi de la facture' }, { status: 500 });
  }
}
