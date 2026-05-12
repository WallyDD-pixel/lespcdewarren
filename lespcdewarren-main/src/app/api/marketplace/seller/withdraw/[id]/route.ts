import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const client: any = prisma as any;
  if (!client.withdrawalRequest) {
    return NextResponse.json({ error: "Fonction de retrait non installée (exécuter la migration Prisma)" }, { status: 501 });
  }

  const wr = await client.withdrawalRequest.findUnique({ where: { id } });
  if (!wr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (wr.sellerId !== session.user.id && session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  return NextResponse.json({ ok: true, withdrawal: wr });
}
