import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const client: any = prisma as any;
  if (!client.withdrawalRequest) return NextResponse.json({ withdrawals: [], feePercent: 7 });

  const withdrawals = await client.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { seller: { select: { id: true, email: true, name: true } } },
  });

  const feePercent = 7;
  return NextResponse.json({ withdrawals, feePercent });
}
