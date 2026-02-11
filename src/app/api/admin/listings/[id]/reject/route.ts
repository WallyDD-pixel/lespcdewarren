import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const listingId = Number(id);
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason : undefined;
  // Utiliser ARCHIVED comme statut de refus; on pourrait ajouter un champ rejectedReason plus tard
  await prisma.listing.update({ where: { id: listingId }, data: { status: 'ARCHIVED' } });
  return NextResponse.json({ ok: true });
}
