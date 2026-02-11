"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default function AdminWithdrawalsPage() {
  const { data, mutate } = useSWR<{ withdrawals: (any)[]; feePercent: number }>("/api/admin/withdrawals", fetcher, { refreshInterval: 20000, revalidateOnFocus: true });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [noteEdit, setNoteEdit] = useState<Record<number, string>>({});

  const feePercent = data?.feePercent ?? 7;
  const list = useMemo(() => {
    const arr = data?.withdrawals ?? [];
    return arr.filter((w: any) => {
      if (statusFilter && w.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!(`${w.id}`.includes(s) || w.paypalEmail.toLowerCase().includes(s) || w.seller.email.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [data, statusFilter, q]);

  const patch = async (id: number, payload: any) => {
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await mutate();
  };

  const act = async (id: number, action: "PROCESS" | "PAY" | "CANCEL") => {
    let note: string | undefined = undefined;
    if (action === "CANCEL" || action === "PAY") {
      note = window.prompt(action === "CANCEL" ? "Raison du refus (optionnel)" : "Note de paiement (optionnel)") || undefined;
    }
    await patch(id, { action, note });
  };

  const saveNote = async (id: number) => {
    const note = noteEdit[id] ?? "";
    await patch(id, { action: "NOTE", note });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Demandes de retrait</h1>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher id/email" className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm">
            <option value="">Tous statuts</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="PAID">PAID</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div className="section-contrast p-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Vendeur</th>
              <th className="px-3 py-2">Email PayPal</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Frais ({feePercent}%)</th>
              <th className="px-3 py-2">Net</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Actions</th>
              <th className="px-3 py-2">Note interne</th>
              <th className="px-3 py-2">Demandé le</th>
              <th className="px-3 py-2">Traité le</th>
              <th className="px-3 py-2">Batch</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w: any) => {
              const fee = Math.floor(w.amountCents * (feePercent / 100));
              const net = Math.max(w.amountCents - fee, 0);
              return (
                <tr key={w.id} className="border-t border-white/10 align-middle">
                  <td className="px-3 py-2">{w.id}</td>
                  <td className="px-3 py-2">{w.seller.name || w.seller.email}</td>
                  <td className="px-3 py-2">{w.paypalEmail}</td>
                  <td className="px-3 py-2">{euros(w.amountCents)}</td>
                  <td className="px-3 py-2">{euros(fee)}</td>
                  <td className="px-3 py-2">{euros(net)}</td>
                  <td className="px-3 py-2">{w.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {w.status === "PENDING" && (
                        <>
                          <button className="btn-ghost" onClick={() => act(w.id, "PROCESS")}>En traitement</button>
                          <button className="btn-danger" onClick={() => act(w.id, "CANCEL")}>Refuser</button>
                        </>
                      )}
                      {w.status === "PROCESSING" && (
                        <>
                          <button className="btn-primary" onClick={() => act(w.id, "PAY")}>Marquer payé</button>
                          <button className="btn-danger" onClick={() => act(w.id, "CANCEL")}>Annuler</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={noteEdit[w.id] ?? w.note ?? ""}
                        onChange={(e) => setNoteEdit((s) => ({ ...s, [w.id]: e.target.value }))}
                        rows={2}
                        className="min-w-[220px] rounded-md border border-white/10 bg-black/20 px-2 py-1"
                        placeholder="Note interne"
                      />
                      <button className="btn-ghost" onClick={() => saveNote(w.id)}>Enregistrer</button>
                    </div>
                  </td>
                  <td className="px-3 py-2">{new Date(w.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2">{w.processedAt ? new Date(w.processedAt).toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-3 py-2">{w.payoutBatchId || "—"}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-white/70" colSpan={12}>Aucune demande</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
