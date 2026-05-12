"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { paypal?: any }
}

function loadPayPalSDK(params: Record<string, string>) {
  return new Promise<void>(async (resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.paypal) return resolve();

    try {
      const confRes = await fetch('/api/public-config', { cache: 'no-store' });
      const conf = await confRes.json().catch(() => ({}));
      const clientId = conf?.paypalClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
      if (!clientId) return reject(new Error('Missing PayPal client id'));

      const query = new URLSearchParams({
        "client-id": clientId,
        intent: "capture",
        currency: params.currency || "EUR",
        components: "buttons",
        "enable-funding": "paylater",
        ...params,
      }).toString();
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?${query}`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("PayPal SDK load error"));
      document.body.appendChild(s);
    } catch (e) {
      reject(e as any);
    }
  });
}

export default function PayPalMarketplaceButtons({ listingId, onSuccess }: { listingId: number; onSuccess?: (orderId: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPayPalSDK({ currency: "EUR" })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !window.paypal) return;

    const buttons = window.paypal.Buttons({
      style: { layout: "vertical", label: "paypal" },
      createOrder: async () => {
        // Créer uniquement l’ordre PayPal côté serveur (pas de commande en base)
        const res = await fetch("/api/marketplace/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, method: "PAYPAL_ONLINE" }),
        });
        const json = await res.json();
        if (!json?.ok || !json?.paypalOrderId) throw new Error("Order create failed");
        return json.paypalOrderId as string;
      },
      onApprove: async (data: any) => {
        if (!data?.orderID) throw new Error("Missing PayPal orderID");
        const res = await fetch("/api/marketplace/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, paypalOrderId: data.orderID }),
        });
        const json = await res.json();
        if (json?.ok) onSuccess?.(json.orderId);
      },
      onCancel: async () => {
        // Rien à faire: aucune commande n’existe avant capture
      },
      onError: (err: any) => {
        console.error("PayPal error", err);
      },
    });

    buttons.render(ref.current);

    return () => {
      try { buttons.close(); } catch {}
    };
  }, [ready, listingId]);

  return <div ref={ref} />;
}
