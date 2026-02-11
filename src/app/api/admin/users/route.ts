export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { email, password, name, role } = body || {};
    if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await prisma.user.create({ data: { email, passwordHash, name: name || null, role: role === "ADMIN" ? ("ADMIN" as any) : ("USER" as any) } });
    return NextResponse.json({ ok: true, user: { id: created.id, email: created.email } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
