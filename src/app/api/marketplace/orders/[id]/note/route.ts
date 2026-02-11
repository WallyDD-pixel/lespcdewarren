import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id: idStr } = await ctx.params; const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const rating = Math.max(1, Math.min(5, Number(body?.rating || 0)));
    const contentRaw: string = typeof body?.content === "string" ? body.content : "";
    const content = contentRaw.trim().slice(0, 1000);

    const order: any = await prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (order.buyerId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });
    if (order.status !== "COMPLETED") return NextResponse.json({ error: "Vous pourrez laisser une note une fois la réception confirmée." }, { status: 400 });

    // Upsert conversation
    const conv = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId: (order as any).listingId, buyerId: order.buyerId } },
      create: { listingId: (order as any).listingId, buyerId: order.buyerId, sellerId: order.sellerId },
      update: {},
    });

    const stars = "★★★★★".slice(0, rating);
    const msgText = [`Note de l’acheteur : ${stars} (${rating}/5)`, content ? content : null]
      .filter(Boolean)
      .join("\n\n");

    const msg = await prisma.message.create({ data: { conversationId: conv.id, authorId: session.user.id, content: msgText } });
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });

    // Notification vendeur (placeholder type pour compat)
    try {
      if ((prisma as any).notification) {
        const notif = await (prisma as any).notification.create({
          data: {
            userId: order.sellerId,
            type: "WITHDRAWAL_STATUS", // TODO: remplacer par ORDER_EVENT
            title: `Nouvelle note sur la commande #${order.id}`,
            message: `L’acheteur a laissé une note: ${rating}/5`,
            link: `/messages/${conv.id}`,
            data: { marketplaceOrderId: order.id, conversationId: conv.id, rating },
          },
        });
        // Optionnel: email vendeur
        const seller = await prisma.user.findUnique({ where: { id: order.sellerId } });
        if (seller?.email) {
          const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
          const html = buildNotificationEmail({
            siteUrl,
            title: notif.title,
            message: `${notif.message}\n\nCliquez pour lire le message de l’acheteur.`,
            ctaHref: notif.link,
            ctaLabel: "Ouvrir la conversation",
          });
          try { await sendMail({ to: seller.email, subject: notif.title, html }); } catch {}
        }
      }
    } catch (e) {
      console.warn("notif seller note failed", e);
    }

    return NextResponse.json({ ok: true, messageId: msg.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
