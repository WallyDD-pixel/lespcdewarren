import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tab = (searchParams.get("tab") || "pending").toLowerCase();

  const soldSince = new Date(Date.now() - 24*60*60*1000);
  let where: any = {};
  if (tab === 'pending') where = { status: 'PENDING_REVIEW' };
  else if (tab === 'published') where = { status: 'PUBLISHED' };
  else if (tab === 'sold') where = { status: 'SOLD', updatedAt: { gte: soldSince } };
  else if (tab === 'rejected') where = { status: 'ARCHIVED' };

  const items = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { seller: { select: { id: true, name: true, email: true } } },
    take: 100,
  });

  return NextResponse.json({ items });
}
