import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateMessageContent } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);

  let conv: any = null;
  try {
    conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, name: true, createdAt: true } },
        seller: { select: { id: true, name: true, createdAt: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { images: { select: { url: true } } },
        },
      },
    });
  } catch (e: any) {
    // Fallback si la table MessageImage n'existe pas encore
    conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, name: true, createdAt: true } },
        seller: { select: { id: true, name: true, createdAt: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  if (conv.buyerId !== session.user.id && conv.sellerId !== session.user.id)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  return NextResponse.json({ conversation: { ...conv, viewerId: session.user.id } });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);

  // Rate limit
  const key = `conv:${id}:user:${session.user.id}`;
  if (!rateLimit(key, 12, 60_000)) return NextResponse.json({ error: "Trop de messages, réessayez plus tard." }, { status: 429 });

  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json"))
    return NextResponse.json({ error: "Content-Type invalide" }, { status: 415 });

  const body = await req.json();
  const { content, imageUrl, imageUrls, videoUrls } = body || {};

  // Interdit tout lien/URL et toute pièce jointe
  const hasAnyAttachment = !!imageUrl || (Array.isArray(imageUrls) && imageUrls.length > 0) || (Array.isArray(videoUrls) && videoUrls.length > 0);
  if (hasAnyAttachment) return NextResponse.json({ error: "Liens et pièces jointes interdits" }, { status: 400 });

  const validation = validateMessageContent(content);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  if (!validation.text) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  if (conv.buyerId !== session.user.id && conv.sellerId !== session.user.id)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const msg = await prisma.message.create({
    data: { conversationId: id, authorId: session.user.id, content: validation.text, imageUrl: null },
  });

  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true, message: msg });
}
