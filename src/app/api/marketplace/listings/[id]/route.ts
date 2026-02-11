import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: true, seller: { select: { id: true, name: true, createdAt: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

  const isAdmin = !!session.user && session.user.role === "ADMIN";
  const isSeller = !!session.user && session.user.id === listing.sellerId;
  const isPubliclyVisible = listing.status === "PUBLISHED" || listing.status === "SOLD";
  if (!isPubliclyVisible && !isAdmin && !isSeller) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }
  return NextResponse.json({ listing });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const body = await req.json();

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  if (existing.sellerId !== session.user.id && session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { title, description, priceCents, condition, city, zip, country, status } = body || {};

  const baseData: any = {
    title,
    description,
    priceCents: priceCents != null ? Number(priceCents) : undefined,
    condition,
    city,
    zip,
    status,
  };
  if (typeof country === "string" && country.trim()) baseData.country = country.trim().toUpperCase();

  let updated;
  try {
    updated = await prisma.listing.update({ where: { id }, data: baseData });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("Unknown argument `country`")) {
      const { country: _omit, ...withoutCountry } = baseData;
      updated = await prisma.listing.update({ where: { id }, data: withoutCountry });
    } else {
      throw err;
    }
  }

  return NextResponse.json({ ok: true, updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  if (existing.sellerId !== session.user.id && session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  // Supprimer images liées puis l’annonce
  await prisma.$transaction([
    prisma.listingImage.deleteMany({ where: { listingId: id } }),
    prisma.listing.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
