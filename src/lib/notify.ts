import { prisma } from "./prisma";
import { emitToUser } from "./notifier";
import { sendMail } from "./mail";
import { buildNotificationEmail } from "./emailTemplates";
import { NotificationType as PrismaNotificationType } from "@prisma/client";

const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || "wallydibombepro@gmail.com";
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://lespcdewarren.fr";

function hasNotificationModel() {
  return Boolean((prisma as any)?.notification);
}

function normalizeType(t: "WITHDRAWAL_STATUS" | "ORDER_EVENT" | "CASE_EVENT") {
  // Sécurise la valeur enum selon la version du client Prisma
  try {
    return (PrismaNotificationType as any)?.[t] ?? t;
  } catch {
    return t;
  }
}

export type NotifyParams = {
  type: "WITHDRAWAL_STATUS" | "ORDER_EVENT" | "CASE_EVENT";
  title: string;
  message?: string;
  link?: string; // ex: /admin/listings
  emailSubject?: string; // optionnel, sinon title
  emailTo?: string; // optionnel, sinon ADMIN_ALERT_EMAIL
};

export async function notifyAdmins(params: NotifyParams) {
  try {
    // 1) Lister les admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });

    // 2) Créer des notifications en base (tolérant aux erreurs)
    if (admins.length && hasNotificationModel()) {
      const now = new Date();
      const typeVal: any = normalizeType(params.type);
      try {
        const ops = admins.map((a) => (prisma as any).notification.create({
          data: {
            userId: a.id,
            type: typeVal,
            title: params.title,
            message: params.message ?? null,
            link: params.link ?? null,
            data: null,
            createdAt: now,
          },
        }));
        await prisma.$transaction(ops);
      } catch (e) {
        console.warn("[notifyAdmins] DB create notification échoué:", e);
      }
    }

    // 3) SSE temps réel (toujours, même si DB échoue)
    for (const a of admins) emitToUser(a.id, { kind: "notification", title: params.title, message: params.message, link: params.link });

    // 4) Email d’alerte admin (toujours)
    const to = params.emailTo || ADMIN_ALERT_EMAIL;
    if (to) {
      const html = buildNotificationEmail({
        siteUrl: SITE_URL,
        title: params.title,
        message: params.message,
        ctaHref: params.link,
        ctaLabel: "Ouvrir",
      });
      const subject = params.emailSubject || params.title;
      await sendMail({ to, subject, html });
    }
  } catch (e) {
    console.warn("[notifyAdmins] erreur:", e);
  }
}

export async function notifyUsers(userIds: number[], params: Omit<NotifyParams, "emailTo" | "emailSubject">) {
  try {
    if (!userIds.length) return;

    // DB (tolérant aux erreurs)
    if (hasNotificationModel()) {
      const now = new Date();
      const typeVal: any = normalizeType(params.type);
      try {
        const ops = userIds.map((id) => (prisma as any).notification.create({
          data: { userId: id, type: typeVal, title: params.title, message: params.message ?? null, link: params.link ?? null, data: null, createdAt: now },
        }));
        await prisma.$transaction(ops);
      } catch (e) {
        console.warn("[notifyUsers] DB create notification échoué:", e);
      }
    }

    // SSE toujours
    for (const id of userIds) emitToUser(id, { kind: "notification", title: params.title, message: params.message, link: params.link });
  } catch (e) {
    console.warn("[notifyUsers] erreur:", e);
  }
}
