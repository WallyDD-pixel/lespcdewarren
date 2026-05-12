import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateSlider, deleteSlider } from "@/lib/sliders";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const slideId = Number(id);
  if (!Number.isFinite(slideId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  if ('title' in body) patch.title = String(body.title);
  if ('subtitle' in body) patch.subtitle = body.subtitle == null ? null : String(body.subtitle);
  if ('image' in body) patch.image = String(body.image);
  if ('align' in body) {
    const a = String(body.align);
    patch.align = (['left','center','right'].includes(a) ? a : 'left') as 'left'|'center'|'right';
  }
  if ('position' in body) patch.position = body.position == null ? null : String(body.position);
  if ('cta' in body) patch.cta = Array.isArray(body.cta) ? body.cta : null;
  if ('isActive' in body) patch.isActive = Boolean(body.isActive);
  if ('sortOrder' in body) patch.sortOrder = Number(body.sortOrder || 0);
  await updateSlider(slideId, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const slideId = Number(id);
  if (!Number.isFinite(slideId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  await deleteSlider(slideId);
  return NextResponse.json({ ok: true });
}
