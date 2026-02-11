import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

// Helpers
function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const productId = Number(id);
    if (!Number.isFinite(productId)) return NextResponse.json({ error: "Produit invalide" }, { status: 400 });

    const session = await getSession();

    const [reviews, myReview, purchased] = await Promise.all([
      prisma.review.findMany({
        where: { productId, published: true },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
        take: 50,
      }),
      session.user ? prisma.review.findUnique({
        where: { userId_productId: { userId: session.user.id, productId } },
      }) : Promise.resolve(null),
      session.user ? prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            OR: [
              { userId: session.user.id },
              { email: session.user.email },
            ],
          },
        },
        select: { id: true },
      }) : Promise.resolve(null),
    ]);

    const ratings = reviews.map((r) => r.rating);
    const average = avg(ratings);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        user: { id: r.userId, name: (r as any).user?.name || "Client" },
        rating: r.rating,
        title: r.title,
        content: r.content,
        createdAt: r.createdAt,
      })),
      stats: {
        count: reviews.length,
        average,
      },
      myReview: myReview ? {
        id: myReview.id,
        rating: myReview.rating,
        title: myReview.title,
        content: myReview.content,
        createdAt: myReview.createdAt,
        updatedAt: myReview.updatedAt,
      } : null,
      canReview: !!purchased,
      isAuthenticated: !!session.user,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(5).max(2000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const productId = Number(id);
    if (!Number.isFinite(productId)) return NextResponse.json({ error: "Produit invalide" }, { status: 400 });

    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Champs invalides" }, { status: 400 });

    // Check purchase
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          OR: [
            { userId: session.user.id },
            { email: session.user.email },
          ],
        },
      },
      select: { id: true },
    });
    if (!purchased) return NextResponse.json({ error: "Vous devez avoir acheté ce produit pour laisser un avis." }, { status: 403 });

    const { rating, title, content } = parsed.data;

    const saved = await prisma.review.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      create: {
        userId: session.user.id,
        productId,
        rating,
        title,
        content,
        published: true,
      },
      update: { rating, title, content, published: true },
    });

    return NextResponse.json({
      ok: true,
      review: {
        id: saved.id,
        rating: saved.rating,
        title: saved.title,
        content: saved.content,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
