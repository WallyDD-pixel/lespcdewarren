import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
// enum miroir local pour validation d’entrées
const OrderStatus = {
  PENDING: "PENDING",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  PAID: "PAID",
  CANCELED: "CANCELED",
  REFUNDED: "REFUNDED",
} as const;

type OrderStatusKey = keyof typeof OrderStatus;

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const o = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
      shippingName: true,
      shippingAddr1: true,
      shippingAddr2: true,
      shippingZip: true,
      shippingCity: true,
      trackingNumber: true,
      trackingUrl: true,
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = {
    id: o.id,
    email: o.email,
    amountCents: o.amountCents,
    currency: o.currency,
    status: o.status,
    createdAt: o.createdAt,
    shipping: {
      name: o.shippingName,
      addr1: o.shippingAddr1,
      addr2: o.shippingAddr2,
      zip: o.shippingZip,
      city: o.shippingCity,
    },
    trackingNumber: o.trackingNumber ?? null,
    trackingUrl: o.trackingUrl ?? null,
    items: o.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      priceCents: it.priceCents,
      product: { id: it.product.id, name: it.product.name, slug: it.product.slug, image: it.product.images[0]?.url || null },
      variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
    })),
  };

  return NextResponse.json({ order });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await request.json();
  const { status, shippingZip, shippingCity, trackingNumber, trackingUrl } = body as { status?: OrderStatusKey; shippingZip?: string | null; shippingCity?: string | null; trackingNumber?: string | null; trackingUrl?: string | null };

  try {
    const data: any = {};
    if (status) data.status = status as any;
    if (shippingZip !== undefined) data.shippingZip = shippingZip;
    if (shippingCity !== undefined) data.shippingCity = shippingCity;
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) data.trackingUrl = trackingUrl;

    const updated = await prisma.order.update({
      where: { id },
      data,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
