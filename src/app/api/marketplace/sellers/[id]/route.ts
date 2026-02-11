import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: any) {
  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const seller = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      role: true,
      profile: { select: { city: true, zip: true, country: true } },
    },
  });
  if (!seller) return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });

  const listings = await prisma.listing.findMany({
    where: { sellerId: id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: { images: true },
    take: 48,
  });

  const listingsCount = await prisma.listing.count({ where: { sellerId: id } });

  // Avis laissés par ce vendeur (sur les produits du store)
  const reviews = await prisma.review.findMany({
    where: { userId: id, published: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      product: { select: { id: true, name: true, slug: true, images: { select: { url: true }, take: 1 } } },
    },
  });

  return NextResponse.json({
    seller,
    listings,
    listingsCount,
    reviews,
  });
}
