import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function sanitizeFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return base.length ? base : `file_${Date.now()}`;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function getUploadsBaseDir() {
  const envDir = process.env.UPLOADS_DIR || "";
  if (envDir && path.isAbsolute(envDir)) return envDir;
  return path.join(process.cwd(), "public", "uploads");
}

function getPublicBasePath() {
  return process.env.UPLOADS_PUBLIC_BASE_URL || "/uploads";
}

async function saveFileToUploads(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uploadsBase = getUploadsBaseDir();
  const uploadsRoot = path.join(uploadsBase, year, month);
  await ensureDir(uploadsRoot);

  const extFromName = path.extname(file.name || "");
  const extFromType = (() => {
    const m = (file.type || "").toLowerCase();
    if (m.includes("jpeg")) return ".jpg";
    if (m.includes("jpg")) return ".jpg";
    if (m.includes("png")) return ".png";
    if (m.includes("webp")) return ".webp";
    if (m.includes("gif")) return ".gif";
    if (m.includes("avif")) return ".avif";
    return extFromName || "";
  })();
  const finalExt = extFromType || extFromName || "";

  const baseName = sanitizeFilename(path.basename(file.name || "image", finalExt || undefined)).slice(0, 60);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${baseName || "image"}_${unique}${finalExt}`;

  const diskPath = path.join(uploadsRoot, filename);
  await fs.writeFile(diskPath, buffer);

  const publicBase = getPublicBasePath().replace(/\/$/, "");
  const publicUrl = `${publicBase}/${year}/${month}/${filename}`;
  return publicUrl;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type multipart/form-data requis" }, { status: 400 });
  }

  const form = await req.formData();
  const files: File[] = [];
  const one = form.get("file");
  if (one instanceof File) files.push(one);
  const many = form.getAll("files").filter((f): f is File => f instanceof File);
  files.push(...many);

  if (!files.length) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const MAX = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

  const urls: string[] = [];
  for (const f of files) {
    if (f.size > MAX) return NextResponse.json({ error: `Fichier trop volumineux: ${f.name}` }, { status: 400 });
    if (f.type && !allowed.includes(f.type)) return NextResponse.json({ error: `Type non supporté: ${f.type}` }, { status: 400 });
    try {
      const url = await saveFileToUploads(f);
      urls.push(url);
    } catch (e: any) {
      console.error("Upload write error:", e);
      return NextResponse.json({ error: "Erreur d’écriture serveur" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, urls });
}
