import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  let since = new Date();
  let until = new Date();
  if (fromParam && toParam) {
    const f = new Date(fromParam);
    const t = new Date(toParam);
    if (!isNaN(f.getTime())) since = f;
    if (!isNaN(t.getTime())) until = t;
  } else {
    const d = Math.max(1, Math.min(365, Number(daysParam || 30)));
    since = new Date();
    since.setDate(since.getDate() - d);
    until = new Date();
  }

  const users = await prisma.user.count();

  const avgAgg = await prisma.review.aggregate({ _avg: { rating: true } });
  const avgRating = Number(avgAgg._avg.rating || 0);

  const storePaidStatuses = ["PAYMENT_RECEIVED", "PAID", "SHIPPED", "DELIVERED"] as const;
  const storeOrders = await prisma.order.count({ where: { status: { in: storePaidStatuses as any } } });
  const storeRevenueAgg = await prisma.order.aggregate({
    _sum: { amountCents: true },
    where: { status: { in: storePaidStatuses as any } },
  });
  const storeDailyRaw = await prisma.order.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: since, lte: until }, status: { in: storePaidStatuses as any } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  const recentStoreOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, amountCents: true, status: true, createdAt: true },
  });

  const dayMap = new Map<string, { revenueCents: number; orders: number }>();
  for (const row of storeDailyRaw) {
    const d = new Date(row.createdAt);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const prev = dayMap.get(key) || { revenueCents: 0, orders: 0 };
    dayMap.set(key, {
      revenueCents: prev.revenueCents + (row._sum.amountCents || 0),
      orders: prev.orders + (row._count._all || 0),
    });
  }

  const daily = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, revenueCents: v.revenueCents, orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    users,
    avgRating,
    orders: storeOrders,
    revenueCents: storeRevenueAgg._sum.amountCents || 0,
    daily,
    recentStoreOrders,
  });
}
