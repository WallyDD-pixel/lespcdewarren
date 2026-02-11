"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(data?.error || "Erreur");
    err.status = res.status;
    throw err;
  }
  return data;
};

type Withdrawal = { id: number; amountCents: number; status: string; createdAt: string; processedAt?: string | null; paypalEmail?: string | null };

export default function WithdrawPage() {
  const [amount, setAmount] = useState(0);
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data, error, mutate } = useSWR<{ spendableCents: number; availableCents: number; pendingCents: number; feePercent: number; withdrawals: Withdrawal[] }>(
    "/api/marketplace/seller/withdraw",
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );

  const spendableCents = data?.spendableCents || 0;
  const availableCents = data?.availableCents || 0;
  const pendingCents = data?.pendingCents || 0;
  const feePercent = data?.feePercent ?? 7;
  const withdrawals = data?.withdrawals || [];
  const authError = (error as any)?.status === 401 ? "Non authentifié" : null;

  const netOf = (cents: number) => Math.max(cents - Math.floor(cents * (feePercent / 100)), 0);

  // Détail des sommes déjà demandées (disponible = reçues - déjà demandés)
  const alreadyRequestedCents = Math.max(availableCents - spendableCents, 0);

  // Suppression du pré-remplissage via OAuth
  useEffect(() => {
    // noop
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const cents = Math.round(amount * 100);
      if (cents > spendableCents) throw new Error("Montant supérieur au solde disponible");
      const emailTrim = email.trim().toLowerCase();
      const email2Trim = email2.trim().toLowerCase();
      if (!emailTrim || !email2Trim) throw new Error("Email PayPal requis");
      if (emailTrim !== email2Trim) throw new Error("Les emails ne correspondent pas");
      const res = await fetch("/api/marketplace/seller/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents, paypalEmail: emailTrim }),
      });
      const j = await res.json().catch(() => null);
      if (res.status === 401) throw new Error("Non authentifié");
      if (!res.ok) throw new Error(j?.error || "Erreur");
      setMessage("Demande envoyée. Vous serez notifié lorsque le virement sera effectué.");
      setAmount(0);
      setEmail("");
      setEmail2("");
      await mutate(); // rafraîchir soldes et liste
    } catch (err: any) {
      setMessage(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (w: Withdrawal) => {
    setSelected(w);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/marketplace/seller/withdraw/${w.id}`, { cache: "no-store" });
      const j = await res.json();
      if (res.ok && j?.withdrawal) setDetail(j.withdrawal);
    } finally {
      setDetailLoading(false);
    }
  };

  const rawCents = Math.round(amount * 100);
  const feeCents = Math.floor(rawCents * (feePercent / 100));
  const netCents = Math.max(rawCents - feeCents, 0);
  const maxNetCents = netOf(spendableCents);

  const emailsMatch = email.trim().toLowerCase() && email.trim().toLowerCase() === email2.trim().toLowerCase();

  return (
    <main className="container py-8 max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Demander un retrait</h1>

      {authError ? (
        <div className="card p-4 text-sm text-red-400">{authError}</div>
      ) : (
        <>
          <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-white/70">Disponible à retirer</div>
              <div className="text-xl font-semibold">{euros(spendableCents)}</div>
              <div className="text-[11px] text-white/60">Reçues: {euros(availableCents)} • Déjà demandés: {euros(alreadyRequestedCents)}</div>
            </div>
            <div>
              <div className="text-sm text-white/70">En attente de réception</div>
              <div className="text-xl font-semibold">{euros(pendingCents)}</div>
              <div className="text-[11px] text-white/60">Sera retirable après confirmation de réception</div>
            </div>
            <div>
              <div className="text-sm text-white/70">Frais de retrait</div>
              <div className="text-xl font-semibold">{feePercent}%</div>
              <div className="text-[11px] text-white/60">Frais si retrait total: {euros(spendableCents - netOf(spendableCents))}</div>
            </div>
          </div>

          <p className="text-sm text-white/70">Le vendeur est payé uniquement lorsque l’acheteur confirme avoir reçu le PC. Avant cela, le montant est affiché comme "En attente de réception".</p>

          <form onSubmit={submit} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm mb-1">Montant à retirer (EUR)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                required
              />
              <div className="mt-1 text-xs text-white/60">Maximum: {euros(spendableCents)} • Net maximum: {euros(maxNetCents)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="card p-3 bg-white/5">
                <div className="text-white/70">Montant</div>
                <div className="font-semibold">{euros(rawCents)}</div>
              </div>
              <div className="card p-3 bg-white/5">
                <div className="text-white/70">Frais ({feePercent}%)</div>
                <div className="font-semibold">{euros(feeCents)}</div>
              </div>
              <div className="card p-3 bg-white/5">
                <div className="text-white/70">Net reçu</div>
                <div className="font-semibold">{euros(netCents)}</div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-amber-500/10 text-amber-100 px-3 py-2 text-sm">
              Vous recevrez <span className="font-semibold">{euros(netCents)}</span> net. Coût des frais: <span className="font-semibold">{euros(feeCents)}</span> ({feePercent}%).
            </div>

            <div>
              <label className="block text-sm mb-1">Compte PayPal (email)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmez l’email PayPal</label>
              <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" required />
              {email2 && email.trim().toLowerCase() !== email2.trim().toLowerCase() && <div className="mt-1 text-xs text-red-400">Les emails ne correspondent pas</div>}
            </div>

            <button disabled={loading || (email.trim().toLowerCase() !== email2.trim().toLowerCase())} className="btn-primary">{loading ? "Envoi..." : "Envoyer la demande"}</button>
            {message && <div className="text-sm text-white/80">{message}</div>}
          </form>

          <section className="card p-4">
            <h2 className="font-semibold mb-3">Vos demandes de retrait</h2>
            {withdrawals.length === 0 ? (
              <div className="text-sm text-white/70">Aucune demande pour le moment.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {withdrawals.map((w) => (
                  <li key={w.id} className="py-2 flex items-center justify-between text-sm">
                    <button onClick={() => openDetail(w)} className="text-left">
                      <div className="font-medium">{euros(w.amountCents)}</div>
                      <div className="text-white/60">Demandé le {new Date(w.createdAt).toLocaleDateString("fr-FR")} {w.processedAt ? ` • Traité le ${new Date(w.processedAt).toLocaleDateString("fr-FR")}` : ""}</div>
                      <div className="text-xs text-white/60">Net {w.status === "PAID" ? "reçu" : "(estimé)"}: {euros(netOf(w.amountCents))} • Frais: {euros(Math.floor(w.amountCents * (feePercent / 100)))}</div>
                    </button>
                    <span className={`px-2 py-1 rounded text-xs border ${w.status === "PAID" ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200" : w.status === "PROCESSING" ? "bg-sky-500/15 border-sky-400/30 text-sky-200" : w.status === "CANCELLED" ? "bg-red-500/15 border-red-400/30 text-red-200" : "bg-white/5 border-white/10 text-white/90"}`}>
                      {w.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected && (
            <section className="card p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">Détails du retrait #{selected.id}</h3>
                <button className="btn-ghost" onClick={() => { setSelected(null); setDetail(null); }}>Fermer</button>
              </div>
              {detailLoading ? (
                <div className="text-sm text-white/70 mt-2">Chargement…</div>
              ) : detail ? (
                <div className="mt-2 text-sm space-y-1">
                  <div><span className="text-white/60">Montant:</span> {euros(detail.amountCents)}</div>
                  <div><span className="text-white/60">Frais ({feePercent}%):</span> {euros(Math.floor(detail.amountCents * (feePercent / 100)))}</div>
                  <div><span className="text-white/60">Net {detail.status === "PAID" ? "reçu" : "(estimé)"}:</span> {euros(netOf(detail.amountCents))}</div>
                  <div><span className="text-white/60">Statut:</span> {detail.status}</div>
                  <div><span className="text-white/60">Demandé le:</span> {new Date(detail.createdAt).toLocaleString("fr-FR")}</div>
                  {detail.processedAt ? (<div><span className="text-white/60">Traité le:</span> {new Date(detail.processedAt).toLocaleString("fr-FR")}</div>) : null}
                  {detail.paypalEmail ? (<div><span className="text-white/60">Compte PayPal:</span> {detail.paypalEmail}</div>) : null}
                  {(detail as any).payoutBatchId ? (<div><span className="text-white/60">Batch PayPal:</span> {(detail as any).payoutBatchId}</div>) : null}
                  {(detail as any).note ? (<div><span className="text-white/60">Note:</span> {(detail as any).note}</div>) : null}
                </div>
              ) : (
                <div className="text-sm text-white/70 mt-2">Introuvable</div>
              )}
            </section>
          )}

          <p className="mt-2 text-xs text-white/60">Astuce: vérifiez attentivement l’adresse PayPal saisie, elle sera utilisée pour le virement.</p>
        </>
      )}
    </main>
  );
}
