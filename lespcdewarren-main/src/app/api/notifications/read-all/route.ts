import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ ok: true });
  const client: any = prisma as any;
  if (!client.notification) return NextResponse.json({ ok: true });

  await client.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
