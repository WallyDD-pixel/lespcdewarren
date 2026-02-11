import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idStr } = await ctx.params; const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const order: any = await (prisma as any).marketplaceOrder.findFirst({
    where: { id, buyerId: session.user.id },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
      trackingNumber: true,
      trackingUrl: true,
      listing: { select: { id: true, title: true } },
      seller: { select: { id: true, name: true, email: true } },
    } as any,
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Charger les cas (SAV)
  const cases = await (prisma as any).marketplaceCase?.findMany?.({
    where: { orderId: order.id, buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      status: true,
      reason: true,
      description: true,
      photos: true,
      returnTrackingNumber: true,
      returnTrackingUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  }).catch(() => [] as any[]) || [];

  return NextResponse.json({ ok: true, order: { ...order, cases } });
}
