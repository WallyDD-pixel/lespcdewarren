import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params; const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json();
  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.priceCents != null) data.priceCents = Number(body.priceCents);
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  const listing = await prisma.listing.update({ where: { id }, data });
  return NextResponse.json({ ok: true, listing });
}
