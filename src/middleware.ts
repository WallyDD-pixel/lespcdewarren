import { NextRequest, NextResponse } from "next/server";

// Polyfill pour 'self' côté serveur (utilisé par certaines dépendances)
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}

// In-memory rate limit store (per Edge instance)
const rr: any = (globalThis as any).__rate__ || ((globalThis as any).__rate__ = new Map<string, { c: number; t: number }>());

function now() { return Date.now(); }

function getIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  // @ts-ignore
  return (req as any).ip || "0.0.0.0";
}

function allow(ip: string, key: string, limit: number, windowMs: number) {
  const k = `${ip}|${key}`;
  const cur = rr.get(k);
  const t = now();
  if (!cur || t - cur.t > windowMs) { rr.set(k, { c: 1, t }); return true; }
  if (cur.c < limit) { cur.c++; return true; }
  return false;
}

function setSecurityHeaders(res: NextResponse, req: NextRequest) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // Scripts: self + PayPal + Google Maps
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com https://maps.googleapis.com https://maps.gstatic.com",
    // Styles: allow inline for Tailwind runtime classes
    "style-src 'self' 'unsafe-inline'",
    // Images: PayPal (stats/cdn) + Google Maps tiles
    "img-src 'self' data: blob: https://*.paypalobjects.com https://*.paypal.com https://c.paypal.com https://b.stats.paypal.com https://maps.gstatic.com",
    // Connections: self + API tiers + PayPal/Braintree/Maps analytics
    "connect-src 'self' https://api-adresse.data.gouv.fr https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com https://c.paypal.com https://b.stats.paypal.com https://assets.braintreegateway.com https://*.braintreegateway.com https://maps.googleapis.com",
    // Frames: PayPal + Braintree Hosted Fields
    "frame-src 'self' https://www.paypal.com https://*.paypal.com https://assets.braintreegateway.com https://*.braintreegateway.com",
    // Fonts
    "font-src 'self' data:",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

function setMinimalSecurityHeaders(res: NextResponse, req: NextRequest) {
  // Pas de CSP/X-Frame-Options afin de laisser les routes PDF définir leurs propres en-têtes
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAdminPdf = path.startsWith("/api/admin/invoices/") && path.includes("/pdf");

  // CSRF check & Rate limit for API mutating requests
  const method = req.method.toUpperCase();
  const isApi = path.startsWith("/api/");
  const isMutable = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  if (isApi && isMutable) {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const url = new URL(req.url);
    const originHost = (() => { try { return origin ? new URL(origin).host : null; } catch { return null; } })();
    const refererHost = (() => { try { return referer ? new URL(referer).host : null; } catch { return null; } })();
    const sameOriginHost = originHost ? originHost === url.host : false;
    const sameRefererHost = refererHost ? refererHost === url.host : false;
    const isAuth = /^\/api\/auth\/(login|register|logout)/i.test(path);
    const secFetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
    const sameSiteByFetch = secFetchSite === "same-origin" || secFetchSite === "same-site";
    // Nouveau: signal Ajax explicite
    const xrw = (req.headers.get("x-requested-with") || "").toLowerCase();
    const isXHR = xrw === "xmlhttprequest";

    // Exiger un signal de même site (Origin/Referer/Fetch-Site), sinon 403 (sauf endpoints auth)
    if (!(sameOriginHost || sameRefererHost || sameSiteByFetch || isXHR) && !isAuth) {
      const res = NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
      setSecurityHeaders(res, req);
      return res;
    }

    // Rate limits
    const ip = getIp(req);
    const pathKey = path
      .replace(/\/[0-9]+(?![\w-])/g, "/:id")
      .replace(/\/[a-f0-9-]{8,}/gi, "/:id");

    const baseOk = allow(ip, `api:${pathKey}`, 120, 60_000);
    if (!baseOk) {
      const res = NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
      setSecurityHeaders(res, req);
      return res;
    }

    // Plus strict pour endpoints sensibles
    const strictBuckets: Array<{ test: RegExp; limit: number }> = [
      { test: /^\/api\/auth\/login/i, limit: 10 },
      { test: /^\/api\/uploads/i, limit: 20 },
      { test: /^\/api\/marketplace\/conversations/i, limit: 60 },
    ];
    for (const b of strictBuckets) {
      if (b.test.test(path)) {
        const ok = allow(ip, `strict:${pathKey}`, b.limit, 60_000);
        if (!ok) {
          const res = NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
          setSecurityHeaders(res, req);
          return res;
        }
      }
    }
  }

  // Section admin protégée
  if (path.startsWith("/admin")) {
    const hasSession = req.cookies.has("lespcdewarren_session");
    if (!hasSession) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", req.nextUrl.pathname);
      const res = NextResponse.redirect(url);
      setSecurityHeaders(res, req);
      return res;
    }
  }

  // Création d'annonce protégée: nécessite une session
  if (path === "/marketplace/new" || path.startsWith("/marketplace/new/")) {
    const hasSession = req.cookies.has("lespcdewarren_session");
    if (!hasSession) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", req.nextUrl.pathname);
      const res = NextResponse.redirect(url);
      setSecurityHeaders(res, req);
      return res;
    }
  }

  const res = NextResponse.next();
  if (isAdminPdf) {
    setMinimalSecurityHeaders(res, req);
  } else {
    setSecurityHeaders(res, req);
  }

  return res;
}

export const config = { matcher: ["/:path*"] };
