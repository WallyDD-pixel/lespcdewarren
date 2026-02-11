import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { listingId, buyerId } = await req.json();
  if (!listingId || !buyerId) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

  const conv = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId: Number(buyerId) } },
    create: { listingId: listing.id, buyerId: Number(buyerId), sellerId: listing.sellerId },
    update: {},
  });

  return NextResponse.json({ ok: true, conversationId: conv.id });
}
