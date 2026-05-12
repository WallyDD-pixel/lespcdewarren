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
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    if (!order) return new NextResponse("Not found", { status: 404 });

    const o: any = order as any;
    const invoiceNumber = (o.invoiceNumber as string) || `PREVIEW-${id}`;
    const items = order.items.map((it) => ({ description: it.product?.name || `Produit #${it.productId}`, quantity: it.quantity, unitPriceCents: it.priceCents }));
    const pdf = await generateInvoicePdf({
      invoiceNumber,
      company: { name: process.env.COMPANY_NAME || "lespcdewarren.fr", address: process.env.COMPANY_ADDRESS, vat: process.env.COMPANY_VAT },
      customer: { name: (o.invoiceCustomerName as string) || order.shippingName || order.email, email: order.email, address1: (o.invoiceCustomerAddr1 as string) || order.shippingAddr1 || undefined, zip: (o.invoiceCustomerZip as string) || order.shippingZip || undefined, city: (o.invoiceCustomerCity as string) || order.shippingCity || undefined },
      currency: order.currency,
      items,
      shippingCents: order.shippingCostCents || 0,
      notes: (o.invoiceNotes as string) || undefined,
    });

    const body = new Uint8Array(pdf);
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${invoiceNumber}.pdf`,
      "Cache-Control": "no-store, max-age=0",
      // Assouplir CSP pour l’aperçu PDF (sinon object-src 'none' bloque le viewer)
      "Content-Security-Policy": "default-src 'self'; object-src 'self' blob: data:; img-src 'self' data: blob:; style-src 'unsafe-inline' 'self'; frame-ancestors 'self'",
      // Neutraliser X-Frame-Options trop strict défini globalement
      "X-Frame-Options": "SAMEORIGIN",
    });
    headers.set("Content-Length", String(body.byteLength));
    return new NextResponse(body, { status: 200, headers });
  } catch (e: any) {
    console.error("[admin:pdf:store] error", e);
    return NextResponse.json({ error: e?.message || "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
