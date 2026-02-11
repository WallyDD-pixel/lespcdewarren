import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { images, categoryId, ...rest } = body || {};

    if (!categoryId || typeof categoryId !== "number") {
      return NextResponse.json({ error: "categoryId manquant ou invalide" }, { status: 400 });
    }
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 400 });
    }

    const created = await prisma.product.create({
      data: {
  ...rest,
        categoryId,
        images: {
          create: (images ?? []).filter((i: any) => i?.url).map((i: any) => ({ url: i.url, alt: i.alt || null })),
        },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2003") {
      return NextResponse.json({ error: "Violation de contrainte: vérifiez la catégorie" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
