"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type OrderItem = {
  id: number;
  quantity: number;
  priceCents: number;
  product: { id: number; name: string; slug: string; image: string | null };
  variant: { id: number; name: string } | null;
};

type Order = {
  id: number;
  email: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "PAYMENT_RECEIVED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "PAID" | "CANCELED" | "REFUNDED";
  shipping: { name: string | null; addr1: string | null; addr2: string | null; zip: string | null; city: string | null };
  createdAt: string;
  items: OrderItem[];
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

function statusFr(s: Order["status"] | string): string {
  switch (s) {
    case "PENDING": return "En attente";
    case "PAYMENT_RECEIVED":
    case "PAID": return "Paiement reçu"; // PAID legacy → traité comme Paiement reçu
    case "PREPARING": return "En préparation";
    case "SHIPPED": return "Expédiée";
    case "DELIVERED": return "Livrée";
    case "CANCELED": return "Annulée";
    case "REFUNDED": return "Remboursée";
    default: return String(s);
  }
}

const STEPS = ["Paiement reçu", "En préparation", "Expédiée", "Livrée"] as const;
function statusToStep(s: Order["status"]) {
  switch (s) {
    case "PAYMENT_RECEIVED":
    case "PAID": return 0;
    case "PREPARING": return 1;
    case "SHIPPED": return 2;
    case "DELIVERED": return 3;
    case "PENDING": return -1; // pas encore payé
    default: return -2; // annulée/remboursée
  }
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mt-3">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, idx) => {
          const done = current >= idx;
          return (
            <li key={label} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full border ${done ? "bg-[var(--accent)]/90 border-[var(--accent)] text-white" : "bg-transparent border-white/20 text-white/60"}`}>
                {done ? "✓" : idx + 1}
              </span>
              <span className={`text-xs ${done ? "text-white" : "text-white/60"}`}>{label}</span>
              {idx < STEPS.length - 1 && <span className={`mx-2 h-px w-8 sm:w-12 ${current > idx ? "bg-[var(--accent)]/60" : "bg-white/10"}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatCurrency(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const publicRefFrom = (id: number, createdAt?: string | Date) => {
  const d = new Date(createdAt || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `CMD-${y}${m}${day}-${String(id).padStart(6, "0")}`;
};

export default function OrdersPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [showHandOverModal, setShowHandOverModal] = useState(false);
  const [markingHandOver, setMarkingHandOver] = useState(false);
  const [handOverOrderId, setHandOverOrderId] = useState<number | null>(null);
  const [handOverProof, setHandOverProof] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const canSearch = useMemo(() => (orderId.trim().length > 0 && email.trim().length > 3) || email.trim().length > 3, [orderId, email]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        if (selectedId) {
          const res = await fetch(`/api/orders?id=${encodeURIComponent(selectedId)}`);
          const data = await res.json();
          if (res.ok && data.orders) {
            setOrders(data.orders);
            setError(null);
            setLoading(false);
            return;
          }
        }
        const res = await fetch(`/api/orders`);
        const data = await res.json();
        if (res.ok && data.orders) {
          setOrders(data.orders);
          setError(null);
        }
      } catch {}
      setLoading(false);
    };
    run();
  }, [selectedId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (orderId.trim()) params.set("id", orderId.trim());
      if (email.trim()) params.set("email", email.trim());
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedOrder = selectedId && orders ? orders.find((o) => String(o.id) === String(selectedId)) : null;

  // Helper pour marquer reçu via endpoint marketplace si l’id correspond
  async function markReceivedMarketplace(id: number) {
    try {
      const res = await fetch(`/api/marketplace/orders/${id}/confirm-received`, { method: "POST" });
      if (res.ok) {
        // recharger détail
        const r = await fetch(`/api/orders?id=${encodeURIComponent(String(id))}`);
        const d = await r.json();
        if (r.ok && d?.orders) setOrders(d.orders);
      } else {
        const j = await res.json().catch(() => null);
        alert(j?.error || "Erreur");
      }
    } catch {}
  }

  const Tracking = ({ order }: { order: Order }) => {
    if (!order.trackingUrl && !order.trackingNumber) return null;
    const label = order.trackingNumber ? `Suivre l'expédition (${order.trackingNumber})` : "Suivre l'expédition";
    return (
      <div className="mt-3">
        {order.trackingUrl ? (
          <a href={order.trackingUrl} target="_blank" rel="noopener" className="btn-ghost inline-flex items-center gap-2">
            🚚 {label}
          </a>
        ) : (
          <div className="text-sm text-white/70">{label}</div>
        )}
      </div>
    );
  };

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Suivi de commande</h1>

      {selectedOrder && (
        <section className="card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-white/60">Commande n°{selectedOrder.id} • Réf: {publicRefFrom(selectedOrder.id, selectedOrder.createdAt)}</div>
              <div className="font-semibold">{formatCurrency(selectedOrder.amountCents, selectedOrder.currency)} • {new Date(selectedOrder.createdAt).toLocaleDateString("fr-FR")}</div>
              <div className="text-xs mt-1">Statut: <span className="font-medium text-[var(--accent)]">{statusFr(selectedOrder.status)}</span></div>
            </div>
            {selectedOrder.shipping.zip && (
              <div className="text-sm text-white/70">
                Livraison: {selectedOrder.shipping.zip} {selectedOrder.shipping.city || ""}
              </div>
            )}
          </div>

          {/* Stepper */}
          {(() => {
            const step = statusToStep(selectedOrder.status);
            if (step === -2) return <div className="mt-3 text-sm text-red-400">Commande annulée/remboursée</div>;
            if (step === -1) return <div className="mt-3 text-sm text-white/70">En attente de paiement</div>;
            return <>
              <Stepper current={step} />
              <Tracking order={selectedOrder} />
              {/* Action marquer reçu si payé (pour commandes marketplace) */}
              {selectedOrder.status === "PAID" && (
                <div className="mt-4">
                  <div className="flex gap-3">
                    <button className="btn-secondary" onClick={() => markReceivedMarketplace(selectedOrder.id)}>Marquer reçu</button>
                    <button className="btn-ghost" onClick={() => { setHandOverOrderId(selectedOrder.id); setShowHandOverModal(true); }}>Remise en mains propres</button>
                  </div>
                </div>
              )}
            </>;
          })()}
        </section>
      )}

      <form onSubmit={onSubmit} className="card p-6 grid gap-4 md:grid-cols-5 items-end">
        <div>
          <label className="block text-sm mb-1">Numéro de commande</label>
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ex: 1234" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email utilisé lors de l'achat" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div className="md:col-span-2 text-sm text-white/60">
          <p>
            - Pour une recherche précise, indiquez le numéro de commande et l'email.
          </p>
          <p>
            - Sinon, entrez uniquement votre email pour lister vos dernières commandes.
          </p>
        </div>
        <button disabled={loading || !canSearch} className="btn-cart rounded-md px-5 py-3 font-semibold disabled:opacity-50">
          {loading ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      {orders && (
        <div className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <div className="text-white/70">Aucune commande trouvée.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-white/60">Commande n°{o.id} • Réf: {publicRefFrom(o.id, o.createdAt)}</div>
                    <div className="font-semibold">{formatCurrency(o.amountCents, o.currency)} • {new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
                    <div className="text-xs mt-1">
                      Statut: {" "}
                      <Link href={`/orders?id=${o.id}`} className="font-medium text-[var(--accent)] hover:underline">
                        {statusFr(o.status)}
                      </Link>
                    </div>
                    {String(selectedId) === String(o.id) && (() => {
                      const step = statusToStep(o.status);
                      if (step >= 0) return <>
                        <Stepper current={step} />
                        <Tracking order={o} />
                      </>;
                      if (step === -1) return <div className="mt-3 text-xs text-white/70">En attente de paiement</div>;
                      return <div className="mt-3 text-xs text-red-400">Commande annulée/remboursée</div>;
                    })()}
                    <div className="text-xs text-white/60 mt-1">Email: {o.email}</div>
                  </div>
                  {o.shipping.zip && (
                    <div className="text-sm text-white/70">
                      Livraison: {o.shipping.zip} {o.shipping.city || ""}
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {o.items.map((it) => (
                    <Link key={it.id} href={`/produit/${it.product.slug}`} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 p-3 hover:border-[var(--accent)]/50">
                      {it.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.product.image} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-white/5 grid place-items-center text-white/40">🖥</div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate">{it.product.name}</div>
                        <div className="text-xs text-white/60">x{it.quantity} • {formatCurrency(it.priceCents, o.currency)}{it.variant ? ` • ${it.variant.name}` : ""}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Remise en mains propres */}
      {showHandOverModal && handOverOrderId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="bg-black rounded p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Confirmer la remise en mains propres</h3>
            <p className="text-sm text-white/70 mb-4">Voulez-vous confirmer que vous avez reçu l'article pour la commande n°{handOverOrderId} ? Cette action marquera la commande comme reçue.</p>
            <label className="block text-sm mb-2">Ajouter une photo (facultatif)</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (!f) { setHandOverProof(null); return; }
                const reader = new FileReader();
                reader.onload = () => {
                  const res = reader.result as string;
                  // small images only; strip data: prefix
                  const idx = res.indexOf(',');
                  setHandOverProof(idx >= 0 ? res.slice(idx + 1) : res);
                };
                reader.readAsDataURL(f);
              }}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn-ghost" onClick={() => { setShowHandOverModal(false); setHandOverOrderId(null); setHandOverProof(null); }}>Annuler</button>
              <button
                className="btn-cart"
                onClick={async () => {
                  try {
                    setMarkingHandOver(true);
                    const body: any = { }; if (handOverProof) body.proofImage = handOverProof;
                    const res = await fetch(`/api/marketplace/orders/${handOverOrderId}/confirm-received`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: Object.keys(body).length ? JSON.stringify(body) : undefined });
                    if (res.ok) {
                      // reload orders
                      const r = await fetch(`/api/orders?id=${encodeURIComponent(String(handOverOrderId))}`);
                      const d = await r.json();
                      if (r.ok && d?.orders) setOrders(d.orders);
                      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Remise confirmée', type: 'success' } }));
                      setShowHandOverModal(false);
                      setHandOverOrderId(null);
                      setHandOverProof(null);
                    } else {
                      const j = await res.json().catch(() => null);
                      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: j?.error || 'Erreur', type: 'error' } }));
                    }
                  } catch (err) {
                    console.error(err);
                    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erreur réseau', type: 'error' } }));
                  } finally {
                    setMarkingHandOver(false);
                  }
                }}
                disabled={markingHandOver}
              >{markingHandOver ? 'Validation…' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
