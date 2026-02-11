export function getAllowedAttachmentHosts(): Set<string> {
  const raw = process.env.ALLOWED_ATTACHMENT_HOSTS || "";
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isHttpsUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isUrlOnAllowedHost(u: string, allowed: Set<string>): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    if (allowed.size === 0) return false; // aucun hôte autorisé -> bloquer par défaut
    const host = url.hostname.toLowerCase();
    return allowed.has(host) || Array.from(allowed).some((h) => host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function sanitizeAttachmentUrls(urls: string[]): string[] {
  const allowed = getAllowedAttachmentHosts();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || typeof u !== "string") continue;
    const lower = u.toLowerCase();
    // Interdire data:, blob:, file:
    if (lower.startsWith("data:") || lower.startsWith("blob:") || lower.startsWith("file:")) continue;
    if (!isUrlOnAllowedHost(u, allowed)) continue;
    out.push(u);
  }
  return out;
}

export function validateMessageContent(content: unknown, max = 2000): { ok: boolean; text: string; error?: string } {
  const text = typeof content === "string" ? content : "";
  if (text.length > max) return { ok: false, text, error: `Message trop long (${text.length}/${max})` };
  return { ok: true, text };
}
