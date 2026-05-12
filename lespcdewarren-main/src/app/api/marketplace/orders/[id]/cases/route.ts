import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: idStr } = await ctx.params; const orderId = Number(idStr);
  if (!Number.isFinite(orderId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind as "ISSUE" | "RETURN" | undefined;
  const reason = (body?.reason || "").slice(0, 180);
  const description = (body?.description || "").slice(0, 4000);
  const photos = Array.isArray(body?.photos) ? body.photos.slice(0, 6) : undefined; // URLs publiques d'images
  if (!kind) return NextResponse.json({ error: "kind manquant" }, { status: 400 });

  const anyPrisma = prisma as any;
  if (!anyPrisma.marketplaceCase?.create) {
    return NextResponse.json({ error: "Serveur non à jour: appliquer la migration Prisma et regénérer le client." }, { status: 500 });
  }

  const created: any = await anyPrisma.marketplaceCase.create({
    data: {
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      kind,
      reason,
      description,
      photos: photos ? (photos as any) : undefined,
    },
  });

  // Notifier le vendeur
  try {
    await (prisma as any).notification?.create?.({
      data: {
        userId: order.sellerId,
        type: "CASE_EVENT",
        title: kind === "RETURN" ? "Demande de retour" : "Problème signalé",
        message: reason ? `${reason}` : undefined,
        link: `/marketplace/seller/dashboard?case=${created.id}`,
        data: { orderId: order.id, caseId: created.id, kind },
      },
    });

    const seller = await prisma.user.findUnique({ where: { id: order.sellerId } });
    if (seller?.email) {
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const html = buildNotificationEmail({
        siteUrl,
        title: kind === "RETURN" ? "Un acheteur a demandé un retour" : "Un acheteur a signalé un problème",
        message: reason || undefined,
        ctaHref: `/marketplace/seller/dashboard?case=${created.id}`,
        ctaLabel: "Voir la demande",
      });
      await sendMail({ to: seller.email, subject: `[Marketplace] ${kind === "RETURN" ? "Demande de retour" : "Problème"} #${order.id}`, html });
    }
  } catch {}

  return NextResponse.json({ ok: true, case: created });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Seller can update case status, add return label/tracking, etc.
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id: idStr } = await ctx.params; const orderId = Number(idStr);
  if (!Number.isFinite(orderId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.sellerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "case id manquant" }, { status: 400 });

  const anyPrisma = prisma as any;
  if (!anyPrisma.marketplaceCase?.update) {
    return NextResponse.json({ error: "Serveur non à jour: appliquer la migration Prisma et regénérer le client." }, { status: 500 });
  }

  const data: any = {};
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.returnTrackingNumber === "string") data.returnTrackingNumber = body.returnTrackingNumber;
  if (typeof body.returnTrackingUrl === "string") data.returnTrackingUrl = body.returnTrackingUrl;

  const updated: any = await anyPrisma.marketplaceCase.update({ where: { id }, data });

  // Notifier l'acheteur
  try {
    await (prisma as any).notification?.create?.({
      data: {
        userId: order.buyerId,
        type: "CASE_EVENT",
        title: "Mise à jour de votre demande",
        message: `Statut: ${updated.status}`,
        link: `/marketplace/my-orders?id=${order.id}`,
        data: { orderId: order.id, caseId: updated.id },
      },
    });
  } catch {}

  return NextResponse.json({ ok: true, case: updated });
}
