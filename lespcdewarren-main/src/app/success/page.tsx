"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/cart";

export default function SuccessPage() {
  const [ok, setOk] = useState<boolean | null>(null);
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") || undefined;
  const token = searchParams.get("token") || undefined; // PayPal returns token (orderId)
  const sessionId = searchParams.get("session_id") || undefined; // Stripe Checkout retourne session_id
  const onsite = searchParams.get("onsite") === "1";
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    const run = async () => {
      // Paiement sur place : commande déjà créée, on vide le panier et on affiche le succès
      if (onsite) {
        setOk(true);
        clearCart();
        return;
      }

      // Stripe Checkout : enregistrer la commande côté serveur
      if (sessionId) {
        try {
          const res = await fetch("/api/stripe/checkout-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          setOk(res.ok && (data?.ok === true));
          if (res.ok) {
            clearCart();
          }
        } catch {
          setOk(false);
        }
        return;
      }

      // PayPal capture (legacy)
      if (provider === "paypal" && token) {
        try {
          const cart = JSON.parse(sessionStorage.getItem("pp:cart") || "[]");
          const shipping = JSON.parse(sessionStorage.getItem("pp:ship") || "{}");
          const res = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: token, cart, shipping }),
          });
          setOk(res.ok);
          if (res.ok) {
            clearCart();
          }
        } catch {
          setOk(false);
        } finally {
          sessionStorage.removeItem("pp:cart");
          sessionStorage.removeItem("pp:ship");
        }
        return;
      }

      // Redirection sans session_id ni PayPal (fallback)
      setOk(true);
      clearCart();
    };
    run();
  }, [provider, token, sessionId, onsite, clearCart]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">{onsite ? "Commande enregistrée" : "Paiement réussi"}</h1>
      <p>
        {onsite
          ? "Votre commande en paiement sur place a bien été enregistrée. Nous vous recontacterons via vos réseaux sociaux (Instagram / Snapchat) pour convenir du rendez-vous et du paiement en espèces ou par virement instantané."
          : "Merci pour votre commande. Vous recevrez un email de confirmation sous peu."}
      </p>
      {ok === false && (
        <p className="mt-2 text-sm text-red-400">Note: la confirmation n'a pas pu créer la commande automatiquement. Vérifiez votre email.</p>
      )}
      <div className="mt-6">
        <Link href="/orders" className="btn-primary">Suivre ma commande</Link>
      </div>
    </main>
  );
}
