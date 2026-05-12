import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAdminSliders, createSlider } from "@/lib/sliders";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await listAdminSliders();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.image) return NextResponse.json({ error: 'title et image sont requis' }, { status: 400 });
  const align = typeof body.align === 'string' ? (['left','center','right'].includes(body.align) ? body.align as 'left'|'center'|'right' : 'left') : 'left';
  const id = await createSlider({
    title: String(body.title),
    subtitle: body.subtitle ? String(body.subtitle) : null,
    image: String(body.image),
    align,
    position: body.position ? String(body.position) : null,
    cta: Array.isArray(body.cta) ? body.cta : null,
    isActive: body.isActive !== false,
  });
  return NextResponse.json({ ok: true, id });
}
