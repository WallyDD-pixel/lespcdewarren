import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  try {
    // Supprime d'abord les notifications liées à la commande (si lien via data ou link)
    await prisma.notification.deleteMany({
      where: {
        link: { contains: `${id}` },
      },
    });
    // Supprime les OrderItem liés à la commande
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    // Puis supprime la commande
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE ORDER] Erreur:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

