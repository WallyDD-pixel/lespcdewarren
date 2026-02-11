"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";

const fetcher = (u: string) => fetch(u).then(async (r) => {
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    // Laisser SWR passer en erreur pour ne pas rester en état de chargement
    const msg = (data && typeof data === "object" && (data as any).error) ? (data as any).error : r.statusText;
    throw new Error(msg || "Erreur réseau");
  }
  return data;
});

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Ajout: mapping FR pour les statuts commande marketplace
const MARKETPLACE_STATUS_FR: Record<string, string> = {
  PENDING: "En attente de paiement",
  PAID: "Payée",
  COMPLETED: "Terminée",
  IN_PERSON_SCHEDULED: "RDV en personne",
  CANCELLED: "Annulée",
};
const statusFr = (s: string) => MARKETPLACE_STATUS_FR[s] ?? s;

// Ajout: mapping FR pour les statuts d'annonce (ListingStatus)
const LISTING_STATUS_FR: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de validation",
  PUBLISHED: "Publiée",
  RESERVED: "Réservée",
  SOLD: "Vendue",
  ARCHIVED: "Archivée",
};
const listingStatusFr = (s: string) => LISTING_STATUS_FR[s] ?? s;

export default function SellerDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<{
    ok: boolean;
    balances: { availableCents: number; pendingCents: number; completedCount: number };
    orders: any[];
    listings: any[];
  }>("/api/marketplace/seller/dashboard", fetcher, { shouldRetryOnError: false });

  const [trackFor, setTrackFor] = useState<number | null>(null);
  const [tn, setTn] = useState("");
  const [turl, setTurl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (error) return <div className="container p-6">Erreur de chargement: {(error as any)?.message || "réseau/serveur"}</div>;
  if (isLoading || !data) return <div className="container p-6">Chargement…</div>;
  if ((data as any)?.error) return <div className="container p-6">Non authentifié</div>;

  const { balances, orders, listings } = data;

  const paidOrders = orders.filter((o) => o.status === "PAID");

  async function saveTracking(orderId: number) {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/marketplace/orders/${orderId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: tn.trim() || null, trackingUrl: turl.trim() || null }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Erreur");
      setTrackFor(null);
      setTn("");
      setTurl("");
      await mutate();
      alert("Numéro de suivi enregistré");
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Espace vendeur</h1>

      {/* Alerte: commandes payées à expédier */}
      {paidOrders.length > 0 && (
        <section className="card p-4 border-amber-400/30 bg-amber-500/5">
          <h2 className="font-semibold mb-2">Action requise</h2>
          <p className="text-sm text-white/80 mb-3">
            Bonne nouvelle ! Votre annonce a trouvé un acheteur et le paiement a été effectué. Vous n’avez plus qu’à expédier le PC (La Poste, Colissimo, Chronopost, DHL, UPS, etc.).
            Renseignez le numéro de suivi pour informer l’acheteur.
          </p>
          <div className="grid gap-3">
            {paidOrders.map((o) => (
              <div key={o.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">Commande n°{o.id} • {o.listing?.title || "Annonce"}</div>
                    <div className="text-white/60">Montant: {euros(o.amountCents)} • Acheteur: {o.buyer?.email || o.buyer?.name || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.trackingNumber ? (
                      <span className="text-xs text-white/70">Suivi: {o.trackingNumber}</span>
                    ) : (
                      <button className="btn-secondary" onClick={() => { setTrackFor(o.id); setTn(""); setTurl(""); }}>Ajouter un suivi</button>
                    )}
                    <Link className="btn-ghost" href={`/marketplace/${o.listing?.id}`}>Voir l’annonce</Link>
                  </div>
                </div>
                {trackFor === o.id && (
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr,2fr,auto]">
                    <input value={tn} onChange={(e)=>setTn(e.target.value)} placeholder="Numéro de suivi" className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                    <input value={turl} onChange={(e)=>setTurl(e.target.value)} placeholder="URL de suivi (optionnel)" className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                    <div className="flex items-center gap-2">
                      <button disabled={submitting} className="btn-primary" onClick={() => saveTracking(o.id)}>{submitting ? "Enregistrement…" : "Enregistrer"}</button>
                      <button className="btn-ghost" onClick={() => setTrackFor(null)}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Balances */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-white/70">Disponible</div>
          <div className="text-2xl font-semibold">{euros(balances.availableCents)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">En attente</div>
          <div className="text-2xl font-semibold">{euros(balances.pendingCents)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-white/70">Ventes complétées</div>
          <div className="text-2xl font-semibold">{balances.completedCount}</div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <Link href="/marketplace/seller/withdraw" className="btn-primary">Demander un retrait</Link>
      </div>

      {/* Orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Commandes</h2>
        </div>
        {orders.length === 0 ? (
          <div className="text-white/70">Aucune commande pour le moment.</div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o) => (
              <div key={o.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="text-sm">#{o.id}</div>
                <div className="text-sm">{o.listing?.title || "Annonce"}</div>
                <div className="text-sm">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
                <div className="text-sm">{statusFr(o.status)}</div>
                <div className="font-semibold">{euros(o.amountCents)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Listings management */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Mes annonces</h2>
          <Link href="/marketplace/new" className="btn-primary">Nouvelle annonce</Link>
        </div>
        {listings.length === 0 ? (
          <div className="text-white/70">Aucune annonce.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <div key={l.id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium line-clamp-1">{l.title}</div>
                  <span className="text-xs uppercase text-white/60">{listingStatusFr(l.status)}</span>
                </div>
                <div className="text-sm text-white/80">{euros(l.priceCents)}</div>
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/marketplace/${l.id}`} className="btn-ghost">Voir</Link>
                  <Link href={`/marketplace/edit/${l.id}`} className="btn-secondary">Modifier</Link>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      if (!confirm("Supprimer cette annonce ?")) return;
                      const res = await fetch(`/api/marketplace/listings/${l.id}`, { method: "DELETE" });
                      if (res.ok) window.location.reload();
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
