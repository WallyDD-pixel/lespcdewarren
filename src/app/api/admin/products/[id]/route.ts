import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const p = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await request.json();
  const { images, ...rest } = body;

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        images: {
          deleteMany: { productId: id },
          create: (images ?? []).filter((i: any) => i.url).map((i: any) => ({ url: i.url, alt: i.alt || null })),
        },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const err = error as Error;
    console.error('PUT /api/admin/products/[id] error:', err, 'Body:', body);
    return NextResponse.json({ error: err.message || 'Erreur inconnue', details: err, body }, { status: 500 });
  }
}
