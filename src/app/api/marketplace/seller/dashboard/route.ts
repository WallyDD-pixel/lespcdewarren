export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const userId = session.user.id;

    const [orders, listings] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where: { sellerId: userId },
        include: { listing: { select: { id: true, title: true } }, buyer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.listing.findMany({
        where: { sellerId: userId },
        include: { images: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

    const sums = orders.reduce(
      (acc: { paidCents: number; pendingCents: number }, o: { status: string; amountCents: number }) => {
        if (o.status === "COMPLETED") acc.paidCents += o.amountCents; // Retirable
        else if (o.status === "PAID") acc.pendingCents += o.amountCents; // En attente de réception
        return acc;
      },
      { paidCents: 0, pendingCents: 0 }
    );

    return NextResponse.json({
      ok: true,
      balances: {
        availableCents: sums.paidCents,
        pendingCents: sums.pendingCents,
        completedCount: orders.filter((o: { status: string }) => o.status === "COMPLETED").length,
      },
      orders,
      listings,
    });
  } catch (e: any) {
    console.error("[seller/dashboard] API error:", e);
    const msg = process.env.NODE_ENV !== "production" ? (e?.message || "Erreur serveur") : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
