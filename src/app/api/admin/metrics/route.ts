import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Période (par défaut 30 jours). Supporte ?days=1|7|30|90 ou ?from=ISO&to=ISO
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

  // Utilisateurs réels
  const users = await prisma.user.count();

  // Annonces (total)
  const listings = await prisma.listing.count();

  // Note moyenne des avis (tous produits)
  const avgAgg = await prisma.review.aggregate({ _avg: { rating: true } });
  const avgRating = Number(avgAgg._avg.rating || 0);

  // Boutique (orders)
  const storePaidStatuses = ["PAYMENT_RECEIVED", "PAID", "SHIPPED", "DELIVERED"] as const;
  const storeOrders = await prisma.order.count({ where: { status: { in: storePaidStatuses as any } } });
  const storeRevenueAgg = await prisma.order.aggregate({ _sum: { amountCents: true }, where: { status: { in: storePaidStatuses as any } } });
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

  // Marketplace (MarketplaceOrder)
  const marketPaidStatuses = ["PAID", "COMPLETED"] as const;
  const marketOrders = await prisma.marketplaceOrder.count({ where: { status: { in: marketPaidStatuses as any } } });
  const marketRevenueAgg = await prisma.marketplaceOrder.aggregate({ _sum: { amountCents: true }, where: { status: { in: marketPaidStatuses as any } } });

  // Breakdown marketplace frais/part vendeur, uniquement pour PAYPAL_ONLINE (1x et 4x)
  const feePercent = 7; // doit correspondre à la logique de retrait
  const marketRangeOrders = await prisma.marketplaceOrder.findMany({
    where: { createdAt: { gte: since, lte: until }, status: { in: marketPaidStatuses as any }, paymentMethod: { in: ["PAYPAL_ONLINE_1X", "PAYPAL_ONLINE_4X"] as any } },
    select: { amountCents: true, createdAt: true },
  });

  let marketGrossCents = 0;
  let marketFeesCents = 0;
  const marketDayMap = new Map<string, { grossCents: number; feesCents: number; orders: number }>();
  for (const o of marketRangeOrders) {
    const fee = Math.floor(o.amountCents * (feePercent / 100));
    marketGrossCents += o.amountCents;
    marketFeesCents += fee;
    const d = new Date(o.createdAt);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const prev = marketDayMap.get(key) || { grossCents: 0, feesCents: 0, orders: 0 };
    marketDayMap.set(key, { grossCents: prev.grossCents + o.amountCents, feesCents: prev.feesCents + fee, orders: prev.orders + 1 });
  }
  const marketSellerCents = Math.max(marketGrossCents - marketFeesCents, 0);
  const marketDaily = Array.from(marketDayMap.entries())
    .map(([date, v]) => ({ date, grossCents: v.grossCents, feesCents: v.feesCents, sellerCents: Math.max(v.grossCents - v.feesCents, 0), orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentMarketplaceOrders = await prisma.marketplaceOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, amountCents: true, status: true, createdAt: true },
  });

  // Nouveaux: derniers signalements/cas SAV marketplace
  let recentMarketplaceCases: any[] = [];
  try {
    recentMarketplaceCases = await (prisma as any).marketplaceCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        kind: true,
        status: true,
        reason: true,
        createdAt: true,
        order: { select: { id: true, listing: { select: { id: true, title: true } } } },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    });
  } catch {}

  // Agrégation quotidienne combinée (clé = jour UTC)
  const dayMap = new Map<string, { revenueCents: number; orders: number }>();
  const pushRows = (rows: { createdAt: Date; _sum: { amountCents: number | null }; _count: { _all: number } }[]) => {
    for (const row of rows) {
      const d = new Date(row.createdAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const prev = dayMap.get(key) || { revenueCents: 0, orders: 0 };
      dayMap.set(key, {
        revenueCents: prev.revenueCents + (row._sum.amountCents || 0),
        orders: prev.orders + (row._count._all || 0),
      });
    }
  };
  pushRows(storeDailyRaw);
  // Pour la série globale, on ajoute aussi la marketplace (brut)
  for (const row of marketDaily) {
    const prev = dayMap.get(row.date) || { revenueCents: 0, orders: 0 };
    dayMap.set(row.date, { revenueCents: prev.revenueCents + row.grossCents, orders: prev.orders + row.orders });
  }

  const daily = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, revenueCents: v.revenueCents, orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    users,
    listings,
    avgRating,
    orders: storeOrders + marketOrders,
    revenueCents: (storeRevenueAgg._sum.amountCents || 0) + (marketRevenueAgg._sum.amountCents || 0),
    daily,
    recentStoreOrders,
    recentMarketplaceOrders,
    marketBreakdown: { grossCents: marketGrossCents, sellerCents: marketSellerCents, feesCents: marketFeesCents, feePercent },
    marketDaily,
    recentMarketplaceCases,
  });
}
