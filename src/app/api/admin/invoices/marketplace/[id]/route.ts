import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await getSession();
    if (!session.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });
    const id = Number(context.params.id);
    const body = await req.formData();
    const data: any = {
      invoiceCustomerName: body.get("invoiceCustomerName") || null,
      invoiceNotes: body.get("invoiceNotes") || null,
    };
    await (prisma as any).marketplaceOrder.update({ where: { id }, data });
    return NextResponse.redirect(new URL(`/admin/invoices/marketplace/${id}`, req.url), { status: 303 });
  } catch (e: any) {
    console.error("[admin:invoice:mp:update] error", e);
    return NextResponse.json({ error: e?.message || "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
