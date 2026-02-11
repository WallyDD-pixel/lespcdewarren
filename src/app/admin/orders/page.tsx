"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_MAP = {
  PENDING: "En attente",
  PAYMENT_RECEIVED: "Paiement reçu",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  PAID: "Paiement reçu",
  CANCELED: "Annulée",
  REFUNDED: "Remboursée",
} as const;

type OrderStatusKey = keyof typeof STATUS_MAP;

const statusFr = (s: string) => STATUS_MAP[(s as OrderStatusKey)] ?? s;

const ORDER_STATUSES: OrderStatusKey[] = [
  "PENDING",
  "PAYMENT_RECEIVED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "REFUNDED",
];

export default function AdminOrdersPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/orders", fetcher, { refreshInterval: 30000 });
  const [showCanceled, setShowCanceled] = useState(false);
  const orders = ((data?.orders ?? []) as Array<{
    id: number;
    email: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
    shippingZip?: string | null;
    shippingCity?: string | null;
  }>);
  const filteredOrders = showCanceled ? orders : orders.filter(o => o.status !== "CANCELED");
  // Chiffre d'affaires total hors commandes annulées
  const totalCA = orders.filter(o => o.status !== "CANCELED").reduce((sum, o) => sum + o.amountCents, 0);

  // Fonction de suppression à l'intérieur du composant pour la portée
  const onDelete = async (id: number) => {
    if (!window.confirm("Supprimer définitivement cette commande ?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      await mutate();
    } catch (e) {
      console.error(e);
      alert("Impossible de supprimer la commande");
    } finally {
      setUpdatingId(null);
    }
  };

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  // Modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const onUpdate = async (id: number, payload: any) => {
  const onDelete = async (id: number) => {
    if (!window.confirm("Supprimer définitivement cette commande ?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      await mutate();
    } catch (e) {
      console.error(e);
      alert("Impossible de supprimer la commande");
    } finally {
      setUpdatingId(null);
    }
  };
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Erreur de mise à jour");
      await mutate();
    } catch (e) {
      console.error(e);
      alert("Impossible de mettre à jour la commande");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100); } catch { return `${(cents/100).toFixed(2)} ${currency}`; }
  };

  const publicRefFrom = (id: number, createdAt?: string | Date) => {
    const d = new Date(createdAt || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `CMD-${y}${m}${day}-${String(id).padStart(6, "0")}`;
  };

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const j = await res.json();
      if (res.ok) setDetail(j.order);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Commandes</h2>
          <div className="text-sm text-white/70 mt-1">Chiffre d'affaires total (hors annulées) : <span className="font-semibold">{formatCurrency(totalCA, "EUR")}</span></div>
        </div>
        <button
          className="btn-ghost border border-white/20 rounded px-3 py-1 text-xs"
          onClick={() => setShowCanceled((v) => !v)}
        >
          {showCanceled ? "Masquer les annulées" : "Afficher les annulées"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-4 py-4" colSpan={8}>Chargement…</td></tr>
            )}
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-t border-white/10">
                <td className="px-4 py-3">{(o as any).invoiceNumber || o.id}</td>
                <td className="px-4 py-3 font-mono">{publicRefFrom((o as any).invoiceNumber ? (o as any).invoiceNumber : o.id, o.createdAt)}</td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3">{formatCurrency(o.amountCents, o.currency)}</td>
                <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-white/10 bg-black/40 px-2 py-1"
                    value={o.status}
                    onChange={(e) => onUpdate(o.id, { status: e.target.value })}
                    disabled={updatingId === o.id}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{statusFr(s)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {/* Voir opens a modal */}
                  <button className="btn-ghost" onClick={() => openDetail(o.id)}>Voir</button>
                  {o.status !== "CANCELED" && o.status !== "REFUNDED" && (
                    <button className="btn-ghost text-red-300" disabled={updatingId === o.id} onClick={() => onUpdate(o.id, { status: "CANCELED" })}>Annuler</button>
                  )}
                  <button className="btn-ghost text-red-500" disabled={updatingId === o.id} onClick={() => onDelete(o.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && !isLoading && (
              <tr><td className="px-4 py-4" colSpan={8}>Aucune commande</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal details */}
      {detailOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDetailOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title-admin" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="order-detail-title-admin" className="font-semibold">
                {detail ? `Commande n°${detail.invoiceNumber || detail.id} • ${publicRefFrom(detail.invoiceNumber || detail.id, detail.createdAt)}` : "Détails de la commande"}
              </h3>
              <button onClick={() => setDetailOpen(false)} aria-label="Fermer" className="h-9 w-9 grid place-items-center rounded border border-white/10 hover:bg-white/5">✕</button>
            </div>
            <div className="p-5 grid gap-4 max-h-[75vh] overflow-auto">
              {detailLoading && <div className="text-white/70 text-sm">Chargement...</div>}
              {!detailLoading && detail && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Statut</div>
                      <div className="font-medium">{statusFr(detail.status)}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Montant</div>
                      <div className="font-medium">{formatCurrency(detail.amountCents, detail.currency)}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Date</div>
                      <div className="font-medium">{new Date(detail.createdAt).toLocaleString("fr-FR")}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Client</div>
                      <div className="font-medium break-all">{detail.email}</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-black/20 p-3">
                    <h4 className="font-semibold mb-2 text-sm">Adresse de livraison</h4>
                    {detail.shipping?.addr1 ? (
                      <div className="text-sm text-white/90 space-y-0.5">
                        {detail.shipping?.name && <div className="font-medium">{detail.shipping.name}</div>}
                        {detail.shipping?.phone && <div className="text-white/70">📞 {detail.shipping.phone}</div>}
                        <div>{detail.shipping.addr1}</div>
                        {detail.shipping.addr2 && <div>{detail.shipping.addr2}</div>}
                        <div>{detail.shipping.zip} {detail.shipping.city}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">—</div>
                    )}
                  </div>

                  {/* Tracking controls */}
                  <div className="rounded-md border border-white/10 bg-black/20 p-3 grid gap-3">
                    <h4 className="font-semibold">Suivi d'expédition</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Numéro de suivi</label>
                        <input defaultValue={detail.trackingNumber || ""} onBlur={(e) => onUpdate(detail.id, { trackingNumber: e.currentTarget.value || null })} placeholder="ex: 1Z999..." className="w-full rounded border border-white/10 bg-black/30 px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1">URL de suivi</label>
                        <input defaultValue={detail.trackingUrl || ""} onBlur={(e) => onUpdate(detail.id, { trackingUrl: e.currentTarget.value || null })} placeholder="https://..." className="w-full rounded border border-white/10 bg-black/30 px-3 py-2" />
                      </div>
                    </div>
                    {(detail.trackingNumber || detail.trackingUrl) && (
                      <div className="text-sm">
                        <span className="text-white/60 mr-2">Aperçu:</span>
                        {detail.trackingUrl ? (
                          <a href={detail.trackingUrl} target="_blank" rel="noopener" className="text-[var(--accent)] hover:underline">{detail.trackingNumber || "Suivre l'expédition"}</a>
                        ) : (
                          <span className="text-white/80">{detail.trackingNumber}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Articles</h4>
                    <ul className="grid gap-2">
                      {detail.items?.map((it: any) => (
                        <li key={it.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 p-2">
                          {it.product?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.product.image} alt="" className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-white/5 grid place-items-center text-white/40">—</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              <Link href={`/produit/${it.product?.slug}`} className="hover:underline">{it.product?.name}</Link>
                            </div>
                            <div className="text-xs text-white/60 line-clamp-1">{it.variant?.name || "—"}</div>
                          </div>
                          <div className="text-sm whitespace-nowrap">× {it.quantity}</div>
                          <div className="text-sm font-medium whitespace-nowrap">{formatCurrency(it.priceCents * it.quantity, detail.currency)}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
