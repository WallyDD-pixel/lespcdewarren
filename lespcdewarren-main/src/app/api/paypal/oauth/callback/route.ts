import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { paypalExchangeAuthCode, paypalGetUserInfo } from "@/lib/paypal";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/marketplace/seller/withdraw")}`, req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";

  if (!code) {
    return NextResponse.redirect(new URL(`/marketplace/seller/withdraw?error=paypal_oauth_cancelled`, req.url));
  }

  // vérifier state
  const sessData: any = (session as any).paypal_oauth || {};
  if (!sessData.state || sessData.state !== state) {
    // purge et redirige
    try { delete (session as any).paypal_oauth; await (session as any).save?.(); } catch {}
    return NextResponse.redirect(new URL(`/marketplace/seller/withdraw?error=paypal_oauth_state`, req.url));
  }

  const redirectUri = String(sessData.redirectUri || new URL(req.url).origin + "/api/paypal/oauth/callback");

  try {
    const tokens = await paypalExchangeAuthCode(code, redirectUri);
    const accessToken = tokens.access_token as string;
    const userinfo = await paypalGetUserInfo(accessToken);
    const email = String(userinfo?.email || "").trim().toLowerCase();
    const payerId = String(userinfo?.user_id || userinfo?.sub || "").trim();

    // purge la session OAuth à l'issue
    try { delete (session as any).paypal_oauth; await (session as any).save?.(); } catch {}

    if (!email || !payerId) {
      return NextResponse.redirect(new URL(`/marketplace/seller/withdraw?error=paypal_oauth_missing`, req.url));
    }

    const target = new URL(`/marketplace/seller/withdraw`, req.url);
    target.searchParams.set("paypal_email", email);
    target.searchParams.set("paypal_payer_id", payerId);
    return NextResponse.redirect(target);
  } catch (e) {
    console.error(e);
    // purge et erreur
    try { delete (session as any).paypal_oauth; await (session as any).save?.(); } catch {}
    return NextResponse.redirect(new URL(`/marketplace/seller/withdraw?error=paypal_oauth_error`, req.url));
  }
}
