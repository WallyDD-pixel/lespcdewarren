import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emitToUser } from "@/lib/notifier";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const order = await prisma.marketplaceOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  if (order.status !== "PAID") return NextResponse.json({ error: "Statut invalide" }, { status: 400 });

  const body = await _req.json().catch(() => ({}));
  const proofProtectedId = typeof body.proofProtectedId === 'string' && body.proofProtectedId ? body.proofProtectedId : null;

  const updated = await prisma.marketplaceOrder.update({ where: { id }, data: { status: "COMPLETED" } });

  // Ajout d'un libellé FR pour le statut dans la notification
  const statusLabelFr = "Terminée";
  const amountStr = (updated.amountCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ` ${updated.currency}`;

  // Message dans la conversation (best-effort)
  try {
    const conv = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId: (updated as any).listingId, buyerId: updated.buyerId } },
      create: { listingId: (updated as any).listingId, buyerId: updated.buyerId, sellerId: updated.sellerId },
      update: {},
    });
    const content = `L’acheteur a confirmé la réception. Le vendeur est désormais crédité de ${amountStr}. Merci pour votre achat !`;
    const msg = await prisma.message.create({ data: { conversationId: conv.id, authorId: session.user.id, content } });

    // Si une preuve protégée a été fournie, enregister le lien en MessageImage
    if (proofProtectedId) {
      try {
        const protectedUrl = `/api/uploads/serve?id=${encodeURIComponent(proofProtectedId)}&orderId=${updated.id}`;
        await prisma.messageImage.create({ data: { messageId: msg.id, url: protectedUrl } });
      } catch (e) {
        console.warn("failed to attach protected proof to message", e);
      }
    }
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
  } catch (e) {
    console.warn("conv message confirm-received failed", e);
  }

  // Notification au vendeur
  try {
    if ((prisma as any).notification) {
      const notif = await (prisma as any).notification.create({
        data: {
          userId: updated.sellerId,
          type: "WITHDRAWAL_STATUS",
          title: `Commande #${updated.id} réceptionnée — fonds crédités`,
          message: `L’acheteur a confirmé la réception. Votre compte a été crédité de ${amountStr}. Vous pouvez demander un retrait.`,
          link: "/marketplace/seller/dashboard",
          data: { marketplaceOrderId: updated.id, status: updated.status, statusLabel: statusLabelFr, amountCredited: amountStr },
        },
      });
      emitToUser(updated.sellerId, { type: "notification", notification: notif });

      // Email vendeur (best-effort)
      const seller = await prisma.user.findUnique({ where: { id: updated.sellerId } });
      if (seller?.email) {
        const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
        const html = buildNotificationEmail({
          siteUrl,
          title: notif.title,
          message: notif.message || undefined,
          ctaHref: notif.link || undefined,
          ctaLabel: "Ouvrir le tableau de bord",
        });
        try { await sendMail({ to: seller.email, subject: notif.title, html }); } catch {}
      }
    }
  } catch (e) {
    console.error("notif seller completed failed", e);
  }

  // Notification à l’acheteur + email de confirmation
  try {
    const buyer = await prisma.user.findUnique({ where: { id: updated.buyerId } });
    if ((prisma as any).notification) {
      const buyerNotif = await (prisma as any).notification.create({
        data: {
          userId: updated.buyerId,
          type: "WITHDRAWAL_STATUS", // TODO: remplacer par ORDER_EVENT
          title: "Réception confirmée",
          message: `Vous avez confirmé la réception de la commande #${updated.id}. Le vendeur a été crédité de ${amountStr}.`,
          link: `/marketplace/my-orders?id=${updated.id}`,
          data: { marketplaceOrderId: updated.id, status: updated.status, statusLabel: statusLabelFr },
        },
      });
      emitToUser(updated.buyerId, { type: "notification", notification: buyerNotif });
    }

    if (buyer?.email) {
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const html = buildNotificationEmail({
        siteUrl,
        title: "Vous avez confirmé la réception",
        message: `Merci ! Le vendeur est désormais crédité de ${amountStr}.`,
        ctaHref: `/marketplace/my-orders?id=${updated.id}`,
        ctaLabel: "Voir ma commande",
      });
      try { await sendMail({ to: buyer.email, subject: `Commande #${updated.id} — réception confirmée`, html }); } catch {}
    }
  } catch (e) {
    console.error("notif buyer completed failed", e);
  }

  return NextResponse.json({ ok: true });
}
