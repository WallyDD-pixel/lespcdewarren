import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let email = searchParams.get("email")?.trim() || undefined;
    const zip = searchParams.get("zip")?.trim() || undefined;
    const idParam = searchParams.get("id");
    const orderId = idParam ? Number(idParam) : undefined;

    const session = await getSession();

    // If looking up a specific order by id, require matching email OR authenticated user's userId
    if (orderId) {
      // Try by user session first
      if (session.user) {
        const o = await prisma.order.findFirst({
          where: { id: orderId, userId: session.user.id },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, images: true, slug: true } },
                variant: { select: { id: true, name: true } },
              },
            },
          },
        });
        if (o) {
          const oo: any = o as any;
          const mapped = {
            id: o.id,
            email: o.email,
            amountCents: o.amountCents,
            currency: o.currency,
            status: o.status as any,
            shipping: {
              name: o.shippingName,
              addr1: o.shippingAddr1,
              addr2: o.shippingAddr2,
              zip: o.shippingZip,
              city: o.shippingCity,
            },
            trackingNumber: oo.trackingNumber ?? null,
            trackingUrl: oo.trackingUrl ?? null,
            createdAt: o.createdAt,
            items: o.items.map((it) => ({
              id: it.id,
              quantity: it.quantity,
              priceCents: it.priceCents,
              product: {
                id: it.product.id,
                name: it.product.name,
                slug: it.product.slug,
                image: it.product.images[0]?.url || null,
              },
              variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
            })),
          };
          return NextResponse.json({ orders: [mapped] });
        }
      }

      // Fallback: require email
      if (!email) return NextResponse.json({ error: "Email requis pour ce numéro de commande" }, { status: 400 });
      const o = await prisma.order.findFirst({
        where: { id: orderId, email },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true, slug: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!o) return NextResponse.json({ orders: [] });
      const oo: any = o as any;
      const mapped = {
        id: o.id,
        email: o.email,
        amountCents: o.amountCents,
        currency: o.currency,
        status: o.status as any,
        shipping: {
          name: o.shippingName,
          addr1: o.shippingAddr1,
          addr2: o.shippingAddr2,
          zip: o.shippingZip,
          city: o.shippingCity,
        },
        trackingNumber: oo.trackingNumber ?? null,
        trackingUrl: oo.trackingUrl ?? null,
        createdAt: o.createdAt,
        items: o.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          priceCents: it.priceCents,
          product: {
            id: it.product.id,
            name: it.product.name,
            slug: it.product.slug,
            image: it.product.images[0]?.url || null,
          },
          variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
        })),
      };
      return NextResponse.json({ orders: [mapped] });
    }

    // List mode: prefer authenticated user orders when logged in
    if (session.user && !email) {
      const orders = await prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true, slug: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
        take: 25,
      });

      const mapped = orders.map((o) => {
        const oo: any = o as any;
        return ({
          id: o.id,
          email: o.email,
          amountCents: o.amountCents,
          currency: o.currency,
          status: o.status as any,
          shipping: {
            name: o.shippingName,
            addr1: o.shippingAddr1,
            addr2: o.shippingAddr2,
            zip: o.shippingZip,
            city: o.shippingCity,
          },
          trackingNumber: oo.trackingNumber ?? null,
          trackingUrl: oo.trackingUrl ?? null,
          createdAt: o.createdAt,
          items: o.items.map((it) => ({
            id: it.id,
            quantity: it.quantity,
            priceCents: it.priceCents,
            product: {
              id: it.product.id,
              name: it.product.name,
              slug: it.product.slug,
              image: it.product.images[0]?.url || null,
            },
            variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
          })),
        });
      });

      return NextResponse.json({ orders: mapped });
    }

    // Guest or explicit email lookup
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const where: any = { email };
    if (zip) where.shippingZip = zip;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, slug: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
      take: 25,
    });

    const mapped = orders.map((o) => {
      const oo: any = o as any;
      return ({
        id: o.id,
        email: o.email,
        amountCents: o.amountCents,
        currency: o.currency,
        status: o.status as any,
        shipping: {
          name: o.shippingName,
          addr1: o.shippingAddr1,
          addr2: o.shippingAddr2,
          zip: o.shippingZip,
          city: o.shippingCity,
        },
        trackingNumber: oo.trackingNumber ?? null,
        trackingUrl: oo.trackingUrl ?? null,
        createdAt: o.createdAt,
        items: o.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          priceCents: it.priceCents,
          product: {
            id: it.product.id,
            name: it.product.name,
            slug: it.product.slug,
            image: it.product.images[0]?.url || null,
          },
          variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
        })),
      });
    });

    return NextResponse.json({ orders: mapped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
