import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getProtectedBaseDir() {
  const envDir = process.env.UPLOADS_PROTECTED_DIR || "";
  if (envDir && path.isAbsolute(envDir)) return envDir;
  return path.join(process.cwd(), "uploads_protected");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orderId = url.searchParams.get("orderId");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // If orderId provided, check relation buyer/seller/admin
  if (orderId) {
    const oId = Number(orderId);
    if (!Number.isFinite(oId)) return NextResponse.json({ error: "orderId invalide" }, { status: 400 });
    const ord = await prisma.marketplaceOrder.findUnique({ where: { id: oId } });
    if (!ord) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    const userId = session.user.id;
    const isRelated = ord.buyerId === userId || ord.sellerId === userId;
    if (!isRelated && session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const base = getProtectedBaseDir();
  const filePath = path.join(base, id);
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const ct = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    // Convert Buffer to ArrayBuffer slice to satisfy NextResponse body types
  // Convert Buffer to Uint8Array which is accepted by NextResponse body types
    // Create a Web ReadableStream from the Node Buffer
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });
    return new NextResponse(stream, { status: 200, headers: { "Content-Type": ct } });
  } catch (e) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
