"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminListingsModeration() {
  const [tab, setTab] = useState<"pending" | "published" | "sold" | "rejected">("pending");
  const { data, mutate } = useSWR(`/api/admin/listings?tab=${tab}`, fetcher, { refreshInterval: 15000 });
  const items = (data?.items ?? []) as Array<{ id: number; title: string; priceCents: number; status: string; createdAt: string; seller?: { id: number; name?: string; email?: string } }>; 

  const act = async (id: number, action: "approve" | "reject") => {
    const res = await fetch(`/api/admin/listings/${id}/${action}`, { method: "POST" });
    if (res.ok) mutate();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Annonces Marketplace</h1>
      </div>

      <div className="flex gap-2">
        {([
          { k: "pending", label: "À valider" },
          { k: "published", label: "Publiées" },
          { k: "sold", label: "Vendues (24h)" },
          { k: "rejected", label: "Refusées" },
        ] as const).map(({ k, label }) => (
          <button key={k} className={`btn-ghost px-3 py-1 rounded ${tab === k ? 'bg-white/10' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className="section-contrast p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Vendeur</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Prix</th>
              <th className="px-3 py-2">Créée</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-t border-white/10">
                <td className="px-3 py-2">{l.id}</td>
                <td className="px-3 py-2 max-w-[28rem] truncate">{l.title}</td>
                <td className="px-3 py-2 text-white/80">{l.seller?.name || l.seller?.email || l.seller?.id}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2">{(l.priceCents/100).toLocaleString('fr-FR', { style:'currency', currency:'EUR'})}</td>
                <td className="px-3 py-2">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/marketplace/${l.id}`} className="btn-ghost mr-2">Voir</Link>
                  {tab === 'pending' ? (
                    <>
                      <button className="btn-primary mr-2" onClick={() => act(l.id, 'approve')}>Valider</button>
                      <button className="btn-ghost" onClick={() => act(l.id, 'reject')}>Refuser</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-white/70" colSpan={7}>Aucune annonce</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
