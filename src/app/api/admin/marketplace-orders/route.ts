import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await prisma.marketplaceOrder.findMany({
    include: { listing: { select: { id: true, title: true } }, buyer: { select: { id: true, email: true, name: true } }, seller: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ orders });
}
