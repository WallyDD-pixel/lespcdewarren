export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emitToUser } from "@/lib/notifier";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const action = String(body.action || "").toUpperCase();
  const note = typeof body.note === "string" ? body.note : undefined;

  const client: any = prisma as any;
  if (!client.withdrawalRequest) return NextResponse.json({ error: "Retraits non installés" }, { status: 501 });

  const current = await client.withdrawalRequest.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Mise à jour note seule
  if (action === "NOTE") {
    const updated = await client.withdrawalRequest.update({ where: { id }, data: { note } });
    return NextResponse.json({ ok: true, withdrawal: updated });
  }

  // transitions autorisées
  let data: any = { note };
  let newStatus: "PROCESSING" | "PAID" | "CANCELLED" | null = null;
  if (action === "PROCESS") {
    if (current.status !== "PENDING") return NextResponse.json({ error: "Transition invalide" }, { status: 400 });
    data.status = "PROCESSING";
    newStatus = "PROCESSING";
  } else if (action === "PAY") {
    if (current.status !== "PROCESSING") return NextResponse.json({ error: "Transition invalide" }, { status: 400 });
    data.status = "PAID";
    data.processedAt = new Date();
    newStatus = "PAID";
  } else if (action === "CANCEL") {
    if (!(current.status === "PENDING" || current.status === "PROCESSING")) return NextResponse.json({ error: "Transition invalide" }, { status: 400 });
    data.status = "CANCELLED";
    data.processedAt = new Date();
    newStatus = "CANCELLED";
  } else {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const updated = await client.withdrawalRequest.update({ where: { id }, data });

  // Créer une notification au vendeur + émettre en temps réel
  try {
    if ((prisma as any).notification && newStatus) {
      const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " EUR";
      const feePercent = 7;
      const feeCents = Math.floor(updated.amountCents * (feePercent / 100));
      const netCents = Math.max(updated.amountCents - feeCents, 0);

      const title = newStatus === "PROCESSING"
        ? "Votre retrait est en traitement"
        : newStatus === "PAID"
        ? "Votre retrait a été payé"
        : "Votre retrait a été refusé";

      let message: string | undefined = note || undefined;
      if (!message) {
        if (newStatus === "PROCESSING") {
          message = `Demande #${updated.id}: ${euros(updated.amountCents)} vers ${updated.paypalEmail}. Frais estimés: ${euros(feeCents)} (${feePercent}%), net estimé: ${euros(netCents)}. Nous procédons au virement PayPal, veuillez patienter.`;
        } else if (newStatus === "PAID") {
          message = `Demande #${updated.id}: ${euros(updated.amountCents)} vers ${updated.paypalEmail}. Frais: ${euros(feeCents)} (${feePercent}%), net payé: ${euros(netCents)}. Le paiement a été envoyé via PayPal.${(updated as any).payoutBatchId ? ` Batch: ${(updated as any).payoutBatchId}.` : ""}`;
        } else if (newStatus === "CANCELLED") {
          message = `Demande #${updated.id}: ${euros(updated.amountCents)} vers ${updated.paypalEmail}. Cette demande a été refusée/annulée.`;
        }
      }

      const createdNotif = await (prisma as any).notification.create({
        data: {
          userId: updated.sellerId,
          type: "WITHDRAWAL_STATUS",
          title,
          message,
          link: "/marketplace/seller/withdraw",
          data: { withdrawalId: updated.id, status: updated.status, amountCents: updated.amountCents, paypalEmail: updated.paypalEmail, feePercent, feeCents, netCents, payoutBatchId: (updated as any).payoutBatchId },
        },
      });
      // Push SSE pour l'utilisateur
      emitToUser(updated.sellerId, { type: "notification", notification: createdNotif });

      // Email au vendeur (best-effort)
      const seller = await prisma.user.findUnique({ where: { id: updated.sellerId } });
      if (seller?.email) {
        const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
        const html = buildNotificationEmail({
          siteUrl,
          title: createdNotif.title,
          message: createdNotif.message || undefined,
          ctaHref: createdNotif.link || undefined,
          ctaLabel: "Voir mes retraits",
        });
        try { await sendMail({ to: seller.email, subject: createdNotif.title, html }); } catch {}
      }
    }
  } catch (e) {
    console.error("Notification create failed", e);
  }

  return NextResponse.json({ ok: true, withdrawal: updated });
}
