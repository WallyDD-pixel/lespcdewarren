import type { NextRequest } from "next/server";
import { getPayPalConfig } from "./settings";

// Valeurs résolues dynamiquement
let _env: "sandbox" | "live" = (process.env.PAYPAL_ENV || process.env.NEXT_PUBLIC_PAYPAL_ENV || "sandbox") as any;
let _clientId = process.env.PAYPAL_CLIENT_ID || "";
let _secret = process.env.PAYPAL_SECRET || "";
let _lastLoad = 0;

async function ensureConfigFresh() {
  const now = Date.now();
  if (now - _lastLoad < 30_000) return; // rafraîchit toutes les 30s
  try {
    const cfg = await getPayPalConfig();
    _env = cfg.env;
    _clientId = cfg.clientId;
    _secret = cfg.secret;
    _lastLoad = now;
  } catch {
    // fallback env vars
    _env = (process.env.PAYPAL_ENV || process.env.NEXT_PUBLIC_PAYPAL_ENV || "sandbox") as any;
    _clientId = process.env.PAYPAL_CLIENT_ID || "";
    _secret = process.env.PAYPAL_SECRET || "";
    _lastLoad = now;
  }
}

export function getPayPalBase() {
  return _env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
export function getPayPalWebBase() {
  return _env === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";
}

async function getAccessToken() {
  await ensureConfigFresh();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${_clientId}:${_secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
  });
  if (!res.ok) throw new Error("PayPal auth failed");
  const json = await res.json();
  return json.access_token as string;
}

export async function paypalExchangeAuthCode(code: string, redirectUri: string) {
  await ensureConfigFresh();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${_clientId}:${_secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal exchange code failed: ${text}`);
  }
  return res.json(); // contains access_token, id_token, scope, token_type, expires_in
}

export async function paypalGetUserInfo(accessToken: string) {
  const base = getPayPalBase();
  // OpenID Connect userinfo
  const res = await fetch(`${base}/v1/identity/openidconnect/userinfo/?schema=openid`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal userinfo failed: ${text}`);
  }
  return res.json(); // expect email, email_verified, user_id/sub
}

export async function paypalCreateOrder(payload: any) {
  const token = await getAccessToken();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed: ${text}`);
  }
  return res.json();
}

export async function paypalCaptureOrder(orderId: string) {
  const token = await getAccessToken();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed: ${text}`);
  }
  return res.json();
}

export async function paypalGetOrder(orderId: string) {
  const token = await getAccessToken();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal get order failed: ${text}`);
  }
  return res.json();
}

// New: generate client token for Advanced Cards (Hosted Fields)
export async function paypalGenerateClientToken() {
  const token = await getAccessToken();
  const base = getPayPalBase();
  const res = await fetch(`${base}/v1/identity/generate-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal client token failed: ${text}`);
  }
  const json = await res.json();
  return json.client_token as string;
}
