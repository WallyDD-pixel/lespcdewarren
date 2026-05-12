import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateMessageContent } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

// List conversations for current user
export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.user.id;

  const convs = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { select: { id: true, title: true, images: { select: { url: true } } } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const convIds = convs.map((c) => c.id);
  let unreadMap: Record<number, number> = {};
  if (convIds.length) {
    const unread = await prisma.message.groupBy({
      by: ["conversationId"],
      where: { conversationId: { in: convIds }, readAt: null, NOT: { authorId: userId } },
      _count: { _all: true },
    });
    unreadMap = Object.fromEntries(unread.map((u: any) => [u.conversationId, u._count._all]));
  }

  const conversations = convs.map((c) => ({ ...c, unreadCount: unreadMap[c.id] || 0 }));

  return NextResponse.json({ conversations });
}

// Start or send a message in a conversation
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.user.id;

  // Rate limit: new message/conversation
  const key = `start:${userId}`;
  if (!rateLimit(key, 6, 60_000)) return NextResponse.json({ error: "Trop de demandes, réessayez plus tard." }, { status: 429 });

  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json"))
    return NextResponse.json({ error: "Content-Type invalide" }, { status: 415 });

  const body = await req.json();
  const { listingId, toUserId, content, imageUrl, imageUrls, videoUrls } = body || {};

  // Interdit tout lien/URL et toute pièce jointe
  const hasAnyAttachment = !!imageUrl || (Array.isArray(imageUrls) && imageUrls.length > 0) || (Array.isArray(videoUrls) && videoUrls.length > 0);
  if (hasAnyAttachment) return NextResponse.json({ error: "Liens et pièces jointes interdits" }, { status: 400 });

  const validation = validateMessageContent(content);
  if (!listingId || !toUserId || !validation.ok || !validation.text)
    return NextResponse.json({ error: validation.error || "Champs requis" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

  const buyerId = userId === listing.sellerId ? Number(toUserId) : userId;
  const sellerId = listing.sellerId;

  const conv = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId } },
    create: { listingId: listing.id, buyerId, sellerId },
    update: {},
  });

  const msg = await prisma.message.create({
    data: { conversationId: conv.id, authorId: userId, content: validation.text, imageUrl: null },
  });

  await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true, conversationId: conv.id, message: msg });
}
