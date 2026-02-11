import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPayPalWebBase } from "@/lib/paypal";

function randomStr(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/marketplace/seller/withdraw")}`, req.url));

  const web = getPayPalWebBase();
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  // Utiliser l’origine de la requête (évite divergences localhost vs IP/nom de domaine)
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/paypal/oauth/callback`;
  const scopes = [
    "openid",
    "profile",
    "email",
  ].join(" ");
  const state = randomStr(24);
  const nonce = randomStr(24);

  // stocker state/nonce + redirectUri en session
  (session as any).paypal_oauth = { state, nonce, redirectUri };
  await (session as any).save?.();

  const url = new URL(`${web}/signin/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  return NextResponse.redirect(url);
}
