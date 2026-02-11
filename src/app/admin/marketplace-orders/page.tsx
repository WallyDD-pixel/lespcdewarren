"use client";
import useSWR from "swr";
import { formatPaymentMethod } from "@/lib/paymentMethodFormatter";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMarketplaceOrdersPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/marketplace-orders", fetcher, { refreshInterval: 30000 });
  const orders = (data?.orders ?? []) as Array<any>;

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/marketplace-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    mutate();
  };

  const fmt = (c: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(c/100);

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Commandes marketplace</h2>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Annonce</th>
              <th className="px-4 py-3">Acheteur</th>
              <th className="px-4 py-3">Vendeur</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-4">Chargement…</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-white/10">
                <td className="px-4 py-3">{o.invoiceNumber || o.id}</td>
                <td className="px-4 py-3 truncate max-w-[16rem]" title={o.listing?.title}>{o.listing?.title}</td>
                <td className="px-4 py-3 truncate max-w-[14rem]" title={o.buyer?.email}>{o.buyer?.name || o.buyer?.email}</td>
                <td className="px-4 py-3 truncate max-w-[14rem]" title={o.seller?.email}>{o.seller?.name || o.seller?.email}</td>
                <td className="px-4 py-3">{fmt(o.amountCents)}</td>
                <td className="px-4 py-3 text-xs">
                  {formatPaymentMethod(o.paymentMethod)}
                </td>
                <td className="px-4 py-3">
                  <select className="rounded border border-white/10 bg-black/40 px-2 py-1" value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                    <option value="PENDING">En attente</option>
                    <option value="IN_PERSON_SCHEDULED">RDV prévu</option>
                    <option value="PAID">Payée</option>
                    <option value="COMPLETED">Terminée</option>
                    <option value="CANCELLED">Annulée</option>
                  </select>
                </td>
                <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
            {orders.length === 0 && !isLoading && <tr><td colSpan={8} className="px-4 py-4">Aucune commande</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
