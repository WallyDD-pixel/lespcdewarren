import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function getUploadsBaseDir() {
  const envDir = process.env.UPLOADS_DIR || "";
  if (envDir && path.isAbsolute(envDir)) return envDir;
  // fallback vers public/uploads du projet
  return path.join(process.cwd(), "public", "uploads");
}

function safeJoin(base: string, ...segments: string[]) {
  const resolved = path.join(base, ...segments);
  const normalizedBase = path.resolve(base) + path.sep;
  const normalizedPath = path.resolve(resolved);
  if (!normalizedPath.startsWith(normalizedBase)) throw new Error("Path traversal");
  return resolved;
}

function guessContentType(p: string) {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(req: Request, ctx: any) {
  try {
    const { params } = ctx || {};
    const base = getUploadsBaseDir();
    const segments = (params?.path ?? []).filter(Boolean);
    const filePath = safeJoin(base, ...segments);
    const file = await fs.readFile(filePath);
    const hdrs = new Headers();
    hdrs.set("Content-Type", guessContentType(filePath));
    hdrs.set("Cache-Control", "public, max-age=31536000, immutable");
    const body = new Uint8Array(file);
    return new Response(body, { status: 200, headers: hdrs });
  } catch (e: any) {
    // If file not found, serve a small fallback image from public (avoid stack trace spam)
    if (e && (e.code === "ENOENT" || e.errno === -4058)) {
      try {
        const fallback = path.join(process.cwd(), "public", "file.svg");
        const data = await fs.readFile(fallback);
        const hdrs = new Headers();
        hdrs.set("Content-Type", "image/svg+xml");
        hdrs.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(new Uint8Array(data), { status: 200, headers: hdrs });
      } catch (innerErr) {
        if (process.env.NODE_ENV !== "production") console.error("[uploads route] fallback read error:", innerErr);
        return new Response("Not found", { status: 404 });
      }
    }
    if (process.env.NODE_ENV !== "production") console.error("[uploads route]", e);
    return new Response("Not found", { status: 404 });
  }
}
