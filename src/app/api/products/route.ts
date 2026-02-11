export async function POST(request: Request) {
  const body = await request.json();
  // Si c'est un PC complet, on l'ajoute dans CompletePC
  if (body.type === "completePC") {
    // Le modèle CompletePC n'existe pas dans le schéma Prisma; stocker comme Product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        priceCents: body.priceCents,
        currency: body.currency || "EUR",
        categoryId: body.categoryId || null,
        stock: body.stock || 0,
        active: body.active !== false,
        specs: body.specs,
        // imageUrl is stored on ProductImage relation in the schema; if Product has imageUrl field, keep it
        ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      },
    });

    return NextResponse.json({ success: true, product });
  }
  // Sinon, on ajoute dans Product (comportement existant)
  const product = await prisma.product.create({
    data: {
      name: body.name,
      slug: body.slug,
      description: body.description,
      priceCents: body.priceCents,
      currency: body.currency || "EUR",
      categoryId: body.categoryId,
      stock: body.stock || 0,
      active: body.active !== false,
      specs: body.specs,
    },
  });
  return NextResponse.json({ success: true, product });
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";

  // Nouveaux paramètres de pagination / filtres côté serveur
  const pageParam = Number(url.searchParams.get("page") || "1");
  const limitParam = Number(url.searchParams.get("limit") || "12");
  const q = url.searchParams.get("q")?.trim() || "";
  const min = url.searchParams.get("min");
  const max = url.searchParams.get("max");
  const sort = (url.searchParams.get("sort") || "created_desc") as
    | "created_desc"
    | "price_asc"
    | "price_desc"
    | "created_asc";

  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const limit = Math.min(50, Math.max(1, isNaN(limitParam) ? 12 : limitParam));

  const where: any = {
    active: true,
    ...(q
      ? {
          name: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
    ...(min ? { priceCents: { gte: Number(min) } } : {}),
    ...(max ? { priceCents: { lte: Number(max) } } : {}),
  };

  const orderBy =
    sort === "price_asc"
      ? { priceCents: "asc" as const }
      : sort === "price_desc"
      ? { priceCents: "desc" as const }
      : sort === "created_asc"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  // Mode "all": retourner l'ensemble (attention performance)
  if (all) {
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        images: { select: { url: true }, take: 1 },
        specs: true,
      },
      orderBy,
    });

    return NextResponse.json({
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        imageUrl: p.images[0]?.url,
        specs: p.specs ?? undefined,
        highlights: Array.isArray(p.specs?.highlights) ? (p.specs.highlights as string[]) : undefined,
        role: typeof p.specs?.role === "string" ? p.specs.role : undefined,
        slot: typeof p.specs?.slot === "string" ? p.specs.slot : undefined,
      })),
      pagination: { page: 1, limit: products.length, total: products.length, totalPages: 1 },
    });
  }

  // Pagination normale
  const total = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      priceCents: true,
      images: { select: { url: true }, take: 1 },
      specs: true,
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  const mapped = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
    imageUrl: p.images[0]?.url,
    specs: p.specs ?? undefined,
    highlights: Array.isArray(p.specs?.highlights) ? (p.specs.highlights as string[]) : undefined,
    role: typeof p.specs?.role === "string" ? p.specs.role : undefined,
    slot: typeof p.specs?.slot === "string" ? p.specs.slot : undefined,
  }));

  return NextResponse.json({
    products: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
