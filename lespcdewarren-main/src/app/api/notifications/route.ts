import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ notifications: [] });
  const client: any = prisma as any;
  if (!client.notification) return NextResponse.json({ notifications: [] });

  const notifications = await client.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications });
}
