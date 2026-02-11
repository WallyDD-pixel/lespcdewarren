export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id: idStr } = await params;
    const orderId = Number(idStr);
    if (isNaN(orderId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: session.user.id },
          { email: session.user.email },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { select: { url: true }, take: 1 },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    return NextResponse.json({ order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
