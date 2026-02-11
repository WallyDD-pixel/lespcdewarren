"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";

export default function PanierPage() {
  const { items, totalCents, clear, remove } = useCart();
  const router = useRouter();

  const goCheckout = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e?.currentTarget;
    if (btn) {
      btn.classList.remove("btn-bump");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (btn as HTMLElement).offsetWidth;
      btn.classList.add("btn-bump");
    }

    if (typeof window !== "undefined" && items[0]) {
      const img = document.querySelector<HTMLImageElement>(`[data-line="${items[0].productId}-${items[0].variantId ?? 0}"] img`);
      const el = (img as HTMLElement) || (btn as HTMLElement) || document.body;
      const rect = el.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("cart:fly", {
          detail: {
            imageUrl: items[0].imageUrl,
            from: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          },
        })
      );
    }

    router.push("/checkout");
  };

  const fmt = (cents: number) => (cents / 100).toFixed(2) + " €";

  return (
    <main className="container py-6 md:py-10">
      {/* Back/continue shopping */}
      <div className="mb-4">
        <Link href="/" className="text-[var(--accent)] hover:underline">← Continuer mes achats</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Panier</h1>

      {!items.length && (
        <div className="card p-6">
          <p className="mb-4">Votre panier est vide.</p>
          <div className="flex gap-3">
            <Link href="/" className="btn-primary">Retour à l'accueil</Link>
            <Link href="/catalogue" className="btn-secondary">Voir le catalogue</Link>
          </div>
        </div>
      )}

      {!!items.length && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Items */}
          <section className="md:col-span-2 space-y-3">
            {items.map((i) => (
              <div key={`${i.productId}-${i.variantId ?? 0}`} data-line={`${i.productId}-${i.variantId ?? 0}`} className="card p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {i.imageUrl ? (
                    <Image src={i.imageUrl} alt={i.name} width={72} height={72} className="w-16 h-16 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-gray-800" />
                  )}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{i.name}</div>
                        <div className="text-sm text-gray-500">Qté: {i.quantity}</div>
                      </div>
                      <div className="font-medium">{fmt(i.priceCents * i.quantity)}</div>
                    </div>
                  </div>
                </div>
                {/* Options details */}
                {i.options && Object.keys(i.options).length > 0 && (
                  <div className="mt-3 text-sm text-gray-300">
                    <div className="font-semibold mb-2">Options sélectionnées :</div>
                    <ul className="space-y-1">
                      {Boolean(i.options.optimisation) && (
                        <li className="flex justify-between">
                          <span>Optimisation</span>
                          <span>{fmt(4999)}</span>
                        </li>
                      )}
                        {Boolean(i.options.wifiAdapter) && (
                        <li className="flex justify-between">
                          <span>Adaptateur Wi‑Fi</span>
                          <span>{fmt(1999)}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-sm">
                  <button onClick={() => remove(i.productId, i.variantId)} className="text-gray-400 hover:text-white">Supprimer</button>
                </div>
              </div>
            ))}
          </section>

          {/* Summary */}
          <aside className="card p-5 h-max sticky top-4" id="cart-summary">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">Sous-total</span>
              <span className="font-semibold">{fmt(totalCents())}</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Taxes et frais de livraison calculés au paiement.</p>
            <button onClick={goCheckout} disabled={!items.length} className="w-full btn-primary disabled:opacity-50">Continuer</button>
            <button onClick={clear} className="w-full mt-3 px-3 py-2 border border-white/10 rounded hover:bg:white/5">Vider le panier</button>
            <Link href="/catalogue" className="w-full mt-3 inline-flex justify-center px-3 py-2 border border-white/10 rounded hover:bg-white/5">Continuer mes achats</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
