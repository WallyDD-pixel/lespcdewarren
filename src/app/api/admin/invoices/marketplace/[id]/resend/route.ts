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

    const order = await prisma.marketplaceOrder.findUnique({ where: { id }, include: { listing: { include: { images: true, seller: true } }, buyer: true } });
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    const o: any = order as any;
    const prefix = process.env.INVOICE_PREFIX || 'LPDW';
    let invNo = (o.invoiceNumber as string | null) || '';
    if (!invNo) {
      const startAt = Number(process.env.INVOICE_START_AT || 1150);
      invNo = await nextInvoiceNumber('mp_invoice_counter', prefix, startAt);
    }

    const pdf = await generateInvoicePdf({
      invoiceNumber: invNo,
      company: { name: process.env.COMPANY_NAME || 'lespcdewarren.fr', address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
      customer: { name: order.buyer?.name || order.buyer?.email || String(order.buyerId), email: order.buyer?.email || '' },
      currency: order.currency,
      items: [{ description: `Marketplace: ${order.listing?.title || order.listingId}`, quantity: 1, unitPriceCents: order.listing?.priceCents || order.amountCents }],
      shippingCents: Math.max(0, order.amountCents - (order.listing?.priceCents || 0)),
      notes: (o.invoiceNotes as string) || 'Merci pour votre achat !',
    });

    // Email stylé
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lespcdewarren.fr';
    const subtotal = (order.listing?.priceCents || 0);
    const html = buildStyledOrderEmail({
      siteUrl,
      orderNo: invNo || String(order.id),
      currency: order.currency,
      items: [{ name: `Marketplace: ${order.listing?.title || order.listingId}`, quantity: 1, priceCents: order.listing?.priceCents || order.amountCents, imageUrl: order.listing?.images?.[0]?.url }],
      subtotalCents: subtotal,
      shippingCents: Math.max(0, order.amountCents - (order.listing?.priceCents || 0)),
      supportEmail: process.env.SUPPORT_EMAIL,
      brandName: process.env.COMPANY_NAME || 'Lespcdewarren',
      accent: '#6d28d9',
      accent2: '#8b5cf6',
    });

    const to = order.buyer?.email || '';
    if (!to) return NextResponse.json({ error: 'Email acheteur manquant' }, { status: 400 });
    await sendMail({ to, subject: `Votre facture ${invNo}` , html, attachments: [{ filename: `${invNo}.pdf`, content: pdf, contentType: 'application/pdf' }], bcc: process.env.ACCOUNTING_BCC });

    await (prisma as any).marketplaceOrder.update({ where: { id: order.id }, data: {
      invoiceNumber: invNo,
      invoiceSentAt: new Date(),
      invoiceCustomerName: order.buyer?.name || order.buyer?.email || String(order.buyerId),
    }});

    return NextResponse.redirect(new URL('/admin/invoices', req.url), { status: 303 });
  } catch (e: any) {
    console.error('[admin:invoice:mp:resend] error', e);
    return NextResponse.json({ error: e?.message || 'Erreur lors de l\'envoi de la facture' }, { status: 500 });
  }
}
