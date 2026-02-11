"use client";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { format } from "date-fns";

const AdminDashboardChartsClient = dynamic(() => import("./AdminDashboardCharts"), { ssr: false });

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminDashboard() {
  const [days, setDays] = useState<number>(30);
  const { data } = useSWR(`/api/admin/metrics?days=${days}`, fetcher, { refreshInterval: 30000 });
  const presence = useSWR('/api/metrics/presence', fetcher, { refreshInterval: 10000 });

  const users = data?.users ?? 0;
  const orders = data?.orders ?? 0;
  const revenueCents = data?.revenueCents ?? 0;
  const listings = data?.listings ?? 0;
  const avgRating = data?.avgRating ?? 0;
  const recentStoreOrders = (data?.recentStoreOrders ?? []) as Array<{ id: number; invoiceNumber?: string | null; amountCents: number; status: string; createdAt: string }>;

  const recentMarketplaceOrders = (data?.recentMarketplaceOrders ?? []) as Array<{ id: number; invoiceNumber?: string | null; amountCents: number; status: string; createdAt: string }>;
  const series = (data?.daily ?? []) as { date: string; revenueCents: number; orders: number }[];
  const marketBreakdown = data?.marketBreakdown as { grossCents: number; sellerCents: number; feesCents: number; feePercent: number } | undefined;
  const marketDaily = (data?.marketDaily ?? []) as { date: string; grossCents: number; sellerCents: number; feesCents: number; orders: number }[];
  const recentCases = (data?.recentMarketplaceCases ?? []) as Array<{ id: number; kind: string; status: string; reason?: string; createdAt: string; order?: { id: number; listing?: { id: number; title?: string } }; buyer?: { id: number; name?: string; email?: string }; seller?: { id: number; name?: string; email?: string } }>;

  const labels = useMemo(() => series.map((d) => format(new Date(d.date), "dd/MM")), [series]);
  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Chiffre d'affaires total (€)",
          data: series.map((d) => Math.round(d.revenueCents / 100)),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, .2)",
        },
        {
          label: "Commandes",
          data: series.map((d) => d.orders),
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, .2)",
          yAxisID: "y2",
        },
      ],
    }),
    [labels, series]
  );

  const marketLabels = useMemo(() => marketDaily.map((d: { date: string }) => format(new Date(d.date), "dd/MM")), [marketDaily]);
  const marketChartData = useMemo(
    () => ({
      labels: marketLabels,
      datasets: [
        {
          label: "Marketplace brut (€)",
          data: marketDaily.map((d: any) => Math.round(d.grossCents / 100)),
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, .2)",
        },
        {
          label: "Part vendeurs (€)",
          data: marketDaily.map((d: any) => Math.round(d.sellerCents / 100)),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, .2)",
        },
        {
          label: "Frais (€)",
          data: marketDaily.map((d: any) => Math.round(d.feesCents / 100)),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, .2)",
        },
      ],
    }),
    [marketLabels, marketDaily]
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <div className="flex items-center gap-2">
          <button className="btn-ghost mr-2" onClick={() => (window.location.href = '/admin/contest/manage')}>Gérer le jeu concours</button>
          <div className="flex gap-2">
          {[1, 7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`btn-ghost px-3 py-1 rounded ${days === d ? "bg-white/10" : ""}`}>
              {d === 1 ? "1 j" : d === 7 ? "7 j" : d === 30 ? "30 j" : "90 j"}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <div className="card p-4">
          <div className="text-sm text-white/70">Utilisateurs</div>
          <div className="mt-1 text-3xl font-semibold">{users}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Visiteurs (24h)</div>
          <div className="mt-1 text-3xl font-semibold">{presence.data?.visitors24h ?? '—'}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">En ligne</div>
          <div className="mt-1 text-3xl font-semibold">{presence.data?.online ?? '—'}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Connectés</div>
          <div className="mt-1 text-3xl font-semibold">{presence.data?.onlineLoggedIn ?? '—'}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Commandes</div>
          <div className="mt-1 text-3xl font-semibold">{orders}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <div className="card p-4">
          <div className="text-sm text-white/70">Chiffre d'affaires</div>
          <div className="mt-1 text-3xl font-semibold">{(revenueCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Annonces</div>
          <div className="mt-1 text-3xl font-semibold">{listings}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Note moyenne</div>
          <div className="mt-1 text-3xl font-semibold">{avgRating.toFixed(2)} / 5</div>
        </div>
      </div>

      <AdminDashboardChartsClient
        chartData={chartData}
        marketChartData={marketChartData}
        days={days}
        hasMarketDaily={Boolean(marketDaily?.length)}
      />

      {/* Groupe Boutique */}
      <div className="mt-2">
        <div className="mb-2 text-sm uppercase tracking-wide text-white/50">Boutique</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="section-contrast p-4">
            <h3 className="mb-3 text-base font-semibold">Dernières commandes boutique</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-white/70">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStoreOrders.map((o) => (
                    <tr key={`s-${o.id}`} className="border-t border-white/10">
                      <td className="px-3 py-2">{o.invoiceNumber || o.id}</td>
                      <td className="px-3 py-2">{format(new Date(o.createdAt), "dd/MM/yyyy HH:mm")}</td>
                      <td className="px-3 py-2">{o.status}</td>
                      <td className="px-3 py-2">{(o.amountCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                    </tr>
                  ))}
                  {recentStoreOrders.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-white/70" colSpan={4}>
                        Aucune commande récente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="section-contrast p-4">
            <h3 className="mb-3 text-base font-semibold">Avis produits récents</h3>
            <div className="text-white/60 text-sm">À venir</div>
          </div>
        </div>
      </div>

      {/* Groupe Marketplace */}
      <div className="mt-4">
        <div className="mb-2 text-sm uppercase tracking-wide text-white/50">Marketplace</div>
        {marketBreakdown && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <div className="text-sm text-white/70">Marketplace brut</div>
              <div className="mt-1 text-2xl font-semibold">{(marketBreakdown.grossCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-white/70">Part vendeurs</div>
              <div className="mt-1 text-2xl font-semibold">{(marketBreakdown.sellerCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-white/70">Vos frais ({marketBreakdown.feePercent}%)</div>
              <div className="mt-1 text-2xl font-semibold">{(marketBreakdown.feesCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
          <div className="section-contrast p-4">
            <h3 className="mb-3 text-base font-semibold">Dernières commandes marketplace</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-white/70">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMarketplaceOrders.map((o) => (
                    <tr key={`m-${o.id}`} className="border-t border-white/10">
                      <td className="px-3 py-2">{o.invoiceNumber || o.id}</td>
                      <td className="px-3 py-2">{format(new Date(o.createdAt), "dd/MM/yyyy HH:mm")}</td>
                      <td className="px-3 py-2">{o.status}</td>
                      <td className="px-3 py-2">{(o.amountCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                    </tr>
                  ))}
                  {recentMarketplaceOrders.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-white/70" colSpan={4}>
                        Aucune commande récente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="section-contrast p-4">
            <h3 className="mb-3 text-base font-semibold">Derniers signalements (SAV)</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-white/70">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Commande</th>
                    <th className="px-3 py-2">Listing</th>
                    <th className="px-3 py-2">Raison</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={`c-${c.id}`} className="border-t border-white/10">
                      <td className="px-3 py-2">{c.id}</td>
                      <td className="px-3 py-2">{c.kind}</td>
                      <td className="px-3 py-2">{c.status}</td>
                      <td className="px-3 py-2">#{c.order?.id}</td>
                      <td className="px-3 py-2 truncate max-w-[220px]">{c.order?.listing?.title || "—"}</td>
                      <td className="px-3 py-2 truncate max-w-[220px]">{c.reason || "—"}</td>
                      <td className="px-3 py-2">{new Date(c.createdAt).toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                  {recentCases.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-white/70" colSpan={7}>Aucun signalement récent</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
