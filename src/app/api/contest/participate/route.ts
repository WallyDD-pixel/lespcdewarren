import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const productId = body.productId ? Number(body.productId) : null;

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

    const ua = req.headers.get('user-agent') || null;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    const meta = JSON.stringify({ ip, ua, raw: body });
    const res = await prisma.$executeRawUnsafe(
      `INSERT INTO ContestParticipant (name, email, phone, productId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      name,
      email,
      phone,
      productId,
      meta
    );
    // $executeRawUnsafe returns number of affected rows for inserts in sqlite; we cannot get id here reliably without an extra query
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 });
  }
}
