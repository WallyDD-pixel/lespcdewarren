import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const trackingNumber = (body?.trackingNumber ?? null) as string | null;
  const trackingUrl = (body?.trackingUrl ?? null) as string | null;

  const order = await prisma.marketplaceOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.sellerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  // Autorisé pour statuts PAID et COMPLETED (mise à jour de suivi possible après coup)
  if (!["PAID", "COMPLETED"].includes(order.status as any)) return NextResponse.json({ error: "Statut non modifiable" }, { status: 400 });

  const updated = await (prisma as any).marketplaceOrder.update({
    where: { id },
    data: { trackingNumber, trackingUrl },
  });

  // Insérer un message dans la conversation
  try {
    const conv = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId: updated.listingId, buyerId: updated.buyerId } },
      create: { listingId: updated.listingId, buyerId: updated.buyerId, sellerId: updated.sellerId },
      update: {},
    });
    const parts: string[] = ["Le vendeur a expédié votre commande."];
    if (trackingNumber) parts.push(`N° de suivi: ${trackingNumber}.`);
    if (trackingUrl) parts.push(`Lien: ${trackingUrl}`);
    await prisma.message.create({ data: { conversationId: conv.id, authorId: session.user.id, content: parts.join(" ") } });
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
  } catch {}

  // Notifier l'acheteur avec lien vers suivi marketplace
  try {
    if ((prisma as any).notification) {
      await (prisma as any).notification.create({
        data: {
          userId: updated.buyerId,
          type: "WITHDRAWAL_STATUS", // TODO: remplacer par ORDER_EVENT
          title: "Votre commande a été expédiée",
          message: trackingNumber ? `Numéro de suivi: ${trackingNumber}` : undefined,
          link: `/marketplace/my-orders?id=${updated.id}`,
          data: { marketplaceOrderId: updated.id, trackingNumber, trackingUrl },
        },
      });
    }

    // Email acheteur (best-effort)
    const buyer = await prisma.user.findUnique({ where: { id: updated.buyerId } });
    if (buyer?.email) {
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const html = buildNotificationEmail({
        siteUrl,
        title: "Votre commande a été expédiée",
        message: trackingNumber ? `Numéro de suivi: ${trackingNumber}` : undefined,
        ctaHref: `/marketplace/my-orders?id=${updated.id}`,
        ctaLabel: "Voir le suivi",
      });
      try { await sendMail({ to: buyer.email, subject: `Commande #${updated.id} expédiée`, html }); } catch {}
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
