import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);

  const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true, buyerId: true, sellerId: true } });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  if (conv.buyerId !== session.user.id && conv.sellerId !== session.user.id)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  // Marquer non lus (des messages de l'autre) comme lus
  const res = await prisma.message.updateMany({ where: { conversationId: id, authorId: { not: session.user.id }, readAt: null }, data: { readAt: new Date() } });

  return NextResponse.json({ ok: true, marked: res.count });
}
