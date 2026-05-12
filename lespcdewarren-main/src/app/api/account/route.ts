import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profile: true,
        createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const recentOrders = await prisma.order.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    // Ajouter commandes marketplace achetées (côté acheteur)
    const recentMarketplaceOrders = await prisma.marketplaceOrder.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        sellerId: true,
        listing: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ user, recentOrders, recentMarketplaceOrders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, phone, address1, address2, zip, city, department, country } = body || {};

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
        profile: {
          upsert: {
            create: { firstName, lastName, phone, address1, address2, zip, city, department, country },
            update: { firstName, lastName, phone, address1, address2, zip, city, department, country },
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
