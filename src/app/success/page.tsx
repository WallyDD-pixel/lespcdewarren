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
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    const run = async () => {
      // PayPal capture
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
      } else {
        // Default to ok when redirected here from other flows
        setOk(true);
        clearCart();
      }
    };
    run();
  }, [provider, token, clearCart]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Paiement réussi</h1>
      <p>Merci pour votre commande. Vous recevrez un email de confirmation sous peu.</p>
      {ok === false && (
        <p className="mt-2 text-sm text-red-400">Note: la confirmation n'a pas pu créer la commande automatiquement. Vérifiez votre email.</p>
      )}
      <div className="mt-6">
        <Link href="/orders" className="btn-primary">Suivre ma commande</Link>
      </div>
    </main>
  );
}
