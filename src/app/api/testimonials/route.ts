import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  country: z.string().trim().max(4).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(5).max(2000),
  experienceDate: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const items = await prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({
      testimonials: items.map((t) => ({
        id: t.id,
        name: t.name,
        country: t.country,
        rating: t.rating,
        title: t.title,
        content: t.content,
        experienceDate: t.experienceDate,
        createdAt: t.createdAt,
      })),
      stats: {
        count: items.length,
        average: items.length ? items.reduce((a, b) => a + b.rating, 0) / items.length : 0,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Champs invalides" }, { status: 400 });

    const t = await prisma.testimonial.create({
      data: {
        name: parsed.data.name,
        country: parsed.data.country,
        rating: parsed.data.rating,
        title: parsed.data.title,
        content: parsed.data.content,
        experienceDate: parsed.data.experienceDate ? new Date(parsed.data.experienceDate) : null,
        published: true,
      },
    });

    return NextResponse.json({ ok: true, id: t.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
