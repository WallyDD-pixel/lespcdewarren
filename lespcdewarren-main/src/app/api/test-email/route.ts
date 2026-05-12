import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  // Admin only
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  const to = (body?.to as string) || process.env.SMTP_USER || session.user.email || "";
  if (!to) return NextResponse.json({ error: "Champ 'to' requis" }, { status: 400 });
  const subject = String(body?.subject || `Test email - ${process.env.SITE_NAME || "Site"}`);
  const html = String(body?.html || `<p>Ceci est un email de test depuis ${process.env.SITE_NAME || "le site"}.</p><p>${new Date().toLocaleString("fr-FR")}</p>`);
  try {
    const id = await sendMail({ to, subject, html });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Envoi échoué" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });
  try {
    const to = session.user.email || process.env.SMTP_USER || "";
    const id = await sendMail({ to, subject: `Test email - ${process.env.SITE_NAME || "Site"}`, html: `<p>Ceci est un email de test.</p><p>${new Date().toLocaleString("fr-FR")}</p>` });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Envoi échoué" }, { status: 500 });
  }
}
