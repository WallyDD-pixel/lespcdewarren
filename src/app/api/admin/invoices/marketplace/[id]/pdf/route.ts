export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateInvoicePdf } from "@/lib/invoice";

export async function GET(_req: NextRequest, context: any) {
  try {
    const session = await getSession();
    if (!session.user || session.user.role !== "ADMIN") return new NextResponse("Interdit", { status: 403 });

    const id = Number(context.params.id);
    const order = await prisma.marketplaceOrder.findUnique({ where: { id }, include: { listing: true, buyer: true } });
    if (!order) return new NextResponse("Not found", { status: 404 });

    const o: any = order as any;
    const invoiceNumber = (o.invoiceNumber as string) || `PREVIEW-MP-${id}`;
    const pdf = await generateInvoicePdf({
      invoiceNumber,
      company: { name: process.env.COMPANY_NAME || "lespcdewarren.fr", address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
      customer: { name: order.buyer?.name || order.buyer?.email || String(order.buyerId), email: order.buyer?.email || "" },
      currency: order.currency,
      items: [{ description: `Marketplace: ${order.listing?.title || order.listingId}`, quantity: 1, unitPriceCents: order.listing?.priceCents || (order.amountCents) }],
      shippingCents: Math.max(0, order.amountCents - (order.listing?.priceCents || 0)),
      notes: (o.invoiceNotes as string) || undefined,
    });

    const body = new Uint8Array(pdf);
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${invoiceNumber}.pdf`,
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "default-src 'self'; object-src 'self' blob: data:; img-src 'self' data: blob:; style-src 'unsafe-inline' 'self'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    });
    headers.set("Content-Length", String(body.byteLength));
    return new NextResponse(body, { status: 200, headers });
  } catch (e: any) {
    console.error("[admin:pdf:mp] error", e);
    return NextResponse.json({ error: e?.message || "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
