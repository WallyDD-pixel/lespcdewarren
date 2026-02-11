import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

enum MarketplaceOrderStatus {
  PENDING = "PENDING",
  IN_PERSON_SCHEDULED = "IN_PERSON_SCHEDULED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params; const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const order = await prisma.marketplaceOrder.findUnique({ where: { id }, include: { listing: true, buyer: true, seller: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params; const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json();
  const { status } = body as { status?: keyof typeof MarketplaceOrderStatus };
  if (!status) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const updated = await prisma.marketplaceOrder.update({ where: { id }, data: { status: status as any } });
  return NextResponse.json({ ok: true, id: updated.id });
}
