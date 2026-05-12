import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params; const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json();
  const role = body?.role as "USER" | "ADMIN" | undefined;
  if (!role) return NextResponse.json({ error: "Bad role" }, { status: 400 });
  await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ ok: true });
}
