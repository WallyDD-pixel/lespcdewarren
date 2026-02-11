import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
      shippingZip: true,
      shippingCity: true,
    },
  });

  return NextResponse.json({ orders });
}
