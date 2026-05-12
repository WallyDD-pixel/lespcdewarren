import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ testimonials });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const t = await prisma.testimonial.create({ data: { name: body.name, country: body.country || null, rating: Math.max(1, Math.min(5, Number(body.rating)||5)), title: body.title || null, content: body.content, experienceDate: body.experienceDate ? new Date(body.experienceDate) : null, source: body.source || "manual", published: !!body.published } });
  return NextResponse.json({ ok: true, id: t.id });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, published } = body as { id: number; published?: boolean };
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await prisma.testimonial.update({ where: { id }, data: { published: !!published } });
  return NextResponse.json({ ok: true });
}
