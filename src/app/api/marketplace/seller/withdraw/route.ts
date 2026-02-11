import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildNotificationEmail } from "@/lib/emailTemplates";
import { emitToUser } from "@/lib/notifier";

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.user.id;

  // Ne comptabiliser que les paiements en ligne pour les retraits (1x et 4x)
  const orders = await prisma.marketplaceOrder.findMany({ where: { sellerId: userId, paymentMethod: { in: ["PAYPAL_ONLINE_1X", "PAYPAL_ONLINE_4X"] } } });
  const totals = orders.reduce(
    (acc: { completed: number; pending: number }, o: { status: string; amountCents: number }) => {
      if (o.status === "COMPLETED") acc.completed += o.amountCents;
      else if (o.status === "PAID") acc.pending += o.amountCents;
      return acc;
    },
    { completed: 0, pending: 0 }
  );

  // Tolérance si le modèle de retraits n'est pas migré/généré
  const client: any = prisma as any;
  let alreadyRequested = 0;
  let withdrawalsList: Array<{ id: number; amountCents: number; status: string; createdAt: Date; processedAt?: Date | null; paypalEmail?: string | null }> = [];
  try {
    if (client.withdrawalRequest) {
      const withdrawals = await client.withdrawalRequest.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, amountCents: true, status: true, createdAt: true, processedAt: true, paypalEmail: true },
      });
      withdrawalsList = withdrawals;
      alreadyRequested = withdrawals
        .filter((w: any) => ["PENDING", "PROCESSING", "PAID"].includes(w.status))
        .reduce((s: number, w: any) => s + (w.amountCents || 0), 0);
    }
  } catch {
    alreadyRequested = 0;
    withdrawalsList = [];
  }

  const feePercent = 7; // %
  const availableCents = totals.completed; // Seules les ventes complétées sont retirables
  const spendableCents = Math.max(availableCents - alreadyRequested, 0);
  const pendingCents = totals.pending; // Ventes payées mais non encore reçues

  return NextResponse.json({ ok: true, availableCents, spendableCents, pendingCents, feePercent, withdrawals: withdrawalsList });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { amountCents, paypalEmail } = body || {};

  if (!amountCents || amountCents <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  if (!paypalEmail || typeof paypalEmail !== "string") return NextResponse.json({ error: "Email PayPal requis" }, { status: 400 });

  // Calculer le solde disponible (COMPLETED uniquement, paiements en ligne 1x et 4x)
  const orders = await prisma.marketplaceOrder.findMany({ where: { sellerId: userId, paymentMethod: { in: ["PAYPAL_ONLINE_1X", "PAYPAL_ONLINE_4X"] } } });
  const totals = orders.reduce(
    (acc: { completed: number }, o: { status: string; amountCents: number }) => {
      if (o.status === "COMPLETED") acc.completed += o.amountCents;
      return acc;
    },
    { completed: 0 }
  );

  // Tolérance si le modèle de retraits n'est pas migré/généré
  const client: any = prisma as any;
  let alreadyRequested = 0;
  try {
    if (client.withdrawalRequest) {
      const withdrawals = await client.withdrawalRequest.findMany({ where: { sellerId: userId, status: { in: ["PENDING", "PROCESSING", "PAID"] } } });
      alreadyRequested = withdrawals.reduce((s: number, w: { amountCents: number }) => s + w.amountCents, 0);
    }
  } catch {
    alreadyRequested = 0;
  }

  const spendable = totals.completed - alreadyRequested;
  if (amountCents > spendable) return NextResponse.json({ error: "Montant supérieur au solde disponible" }, { status: 400 });

  if (!client.withdrawalRequest) {
    return NextResponse.json({ error: "Fonction de retrait non installée (exécuter la migration Prisma)" }, { status: 501 });
  }

  const created = await client.withdrawalRequest.create({ data: { sellerId: userId, amountCents, paypalEmail, status: "PENDING" } });

  // Notifier le vendeur avec des détails clairs + email
  try {
    const feePercent = 7;
    const feeCents = Math.floor(created.amountCents * (feePercent / 100));
    const netCents = Math.max(created.amountCents - feeCents, 0);
    const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " EUR";

    if (client.notification) {
      const notif = await client.notification.create({
        data: {
          userId,
          type: "WITHDRAWAL_STATUS",
          title: "Demande de retrait créée",
          message: `Vous avez demandé un retrait de ${euros(created.amountCents)} vers le compte PayPal ${created.paypalEmail}. Frais estimés: ${euros(feeCents)} (${feePercent}%), net estimé: ${euros(netCents)}. Veuillez patienter pendant le traitement de votre demande.`,
          link: "/marketplace/seller/withdraw",
          data: { withdrawalId: created.id, status: created.status, amountCents: created.amountCents, feePercent, feeCents, netCents, paypalEmail: created.paypalEmail },
        },
      });
      emitToUser(userId, { type: "notification", notification: notif });
    }

    const seller = await prisma.user.findUnique({ where: { id: userId } });
    if (seller?.email) {
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";
      const html = buildNotificationEmail({
        siteUrl,
        title: "Votre demande de retrait a été enregistrée",
        message: `Montant: ${euros(created.amountCents)} • Frais estimés: ${euros(feeCents)} (${feePercent}%) • Net estimé: ${euros(netCents)} • Compte PayPal: ${created.paypalEmail}. Nous vous informerons par email dès qu'elle passera en traitement ou sera payée.`,
        ctaHref: "/marketplace/seller/withdraw",
        ctaLabel: "Voir mes retraits",
      });
      try { await sendMail({ to: seller.email, subject: `Retrait #${created.id} — demande enregistrée`, html }); } catch {}
    }
  } catch (e) {
    console.warn("withdrawal-created notify/email failed", e);
  }

  return NextResponse.json({ ok: true, withdrawal: created });
}
