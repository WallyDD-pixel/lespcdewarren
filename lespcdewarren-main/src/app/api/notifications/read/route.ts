import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const client: any = prisma as any;
  if (!client.notification) return NextResponse.json({ ok: true });

  await client.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
