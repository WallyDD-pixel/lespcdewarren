import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true, listings: true } } } });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, slug, parentId } = body || {};
  if (!name || !slug) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const c = await prisma.category.create({ data: { name, slug, parentId: parentId ?? null } });
  return NextResponse.json({ ok: true, id: c.id });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, name, slug, parentId } = body || {};
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await prisma.category.update({ where: { id: Number(id) }, data: { ...(name ? { name } : {}), ...(slug ? { slug } : {}), parentId: parentId ?? null } });
  return NextResponse.json({ ok: true });
}
