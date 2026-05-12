import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get("pageSize") || 10)));
  const status = url.searchParams.get("status") || undefined;

  const where: any = { buyerId: session.user.id };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.marketplaceOrder.count({ where }),
    prisma.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
        sellerId: true,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, page, pageSize, total, orders });
}
