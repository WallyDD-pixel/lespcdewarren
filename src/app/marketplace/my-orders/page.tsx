"use client";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Ajout: mapping FR pour les statuts
const MARKETPLACE_STATUS_FR: Record<string, string> = {
  PENDING: "En attente de paiement",
  PAID: "Payée",
  COMPLETED: "Terminée",
  IN_PERSON_SCHEDULED: "RDV en personne",
  CANCELLED: "Annulée",
};
const statusFr = (s: string) => MARKETPLACE_STATUS_FR[s] ?? s;

export default function MyMarketplaceOrdersPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const page = Math.max(1, Number(sp.get("page") || 1));
  const status = sp.get("status") || "";
  const preselectId = sp.get("id");
  const pageSize = 10;

  const { data, mutate } = useSWR<{ ok: boolean; page: number; pageSize: number; total: number; orders: any[] }>(`/api/marketplace/my-orders?page=${page}&pageSize=${pageSize}${status ? `&status=${encodeURIComponent(status)}` : ""}`, fetcher);
  const orders = data?.orders || [];
  const total = data?.total || 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const goPage = (p: number) => {
    const s = new URLSearchParams(sp as any);
    s.set("page", String(p));
    router.push(`/marketplace/my-orders?${s.toString()}`);
  };

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<null | "link" | "number" >(null);
  const [marking, setMarking] = useState(false);
  const [markingHandOver, setMarkingHandOver] = useState(false);
  const [handOverProof, setHandOverProof] = useState<string | null>(null);
  const [showInlineHandOver, setShowInlineHandOver] = useState(false);
  const [handOverPreview, setHandOverPreview] = useState<string | null>(null);
  const [handOverFileName, setHandOverFileName] = useState<string | null>(null);
  const [handOverFileSize, setHandOverFileSize] = useState<number | null>(null);
  const [handOverFileTooLarge, setHandOverFileTooLarge] = useState(false);
  const [noteRating, setNoteRating] = useState<number>(5);
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const copy = async (text?: string | null, kind: "link" | "number" = "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  // Préselection via ?id= pour ouvrir le détail directement
  useEffect(() => {
    if (!preselectId || !orders.length) return;
    const idNum = Number(preselectId);
    if (Number.isFinite(idNum) && orders.some((o) => o.id === idNum)) {
      setOpenId(idNum);
    }
  }, [preselectId, orders.length]);

  // Charger détail à l'ouverture
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!openId) { setDetail(null); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/marketplace/my-orders/${openId}`);
        const j = await res.json();
        if (res.ok && alive) setDetail(j.order);
      } finally { if (alive) setLoading(false); }
    };
    run();
    return () => { alive = false; };
  }, [openId]);

  async function markReceived(id: number) {
    const res = await fetch(`/api/marketplace/orders/${id}/confirm-received`, { method: "POST" });
    if (res.ok) mutate();
  }

  // Formulaire SAV
  const [caseKind, setCaseKind] = useState<"ISSUE" | "RETURN">("ISSUE");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  async function uploadFiles(fs: FileList | null) {
    if (!fs || !fs.length) return;
    const form = new FormData();
    for (const f of Array.from(fs).slice(0, 6)) form.append("files", f);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const j = await res.json();
    if (res.ok && Array.isArray(j.urls)) setPhotos((p) => [...p, ...j.urls].slice(0, 6));
  }
  async function submitCase() {
    if (!openId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/orders/${openId}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: caseKind, reason, description, photos }),
      });
      if (res.ok) {
        setReason(""); setDescription(""); setPhotos([]);
        // recharger le détail pour voir le case créé
        const r = await fetch(`/api/marketplace/my-orders/${openId}`);
        const j = await r.json();
        if (r.ok) setDetail(j.order);
      }
    } finally { setSubmitting(false); }
  }

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes achats marketplace</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => router.push(`/marketplace/my-orders?${new URLSearchParams({ page: "1", status: e.target.value }).toString()}`)}
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente de paiement</option>
            <option value="PAID">Payée (en attente de réception)</option>
            <option value="COMPLETED">Terminée</option>
            <option value="IN_PERSON_SCHEDULED">RDV en personne</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-white/70">Aucune commande.</div>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-left min-w-0">
                <div className="text-sm text-white/60">#{o.id} • {new Date(o.createdAt).toLocaleDateString("fr-FR")} • {o.listing?.title || "Annonce"}</div>
                <div className="text-xs uppercase text-white/60">{statusFr(o.status)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => setOpenId(o.id)}>Détails</button>
                <Link href={`/marketplace/${o.listing?.id || ""}`} className="btn-ghost">Voir</Link>
              </div>
            </div>
          ))}
        </div>
      )}

  {/* hand-over inline: removed modal, will render inline inside detail */}

      <div className="flex items-center justify-between mt-4">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>Précédent</button>
        <div className="text-sm text-white/60">Page {page} / {maxPage}</div>
        <button className="btn-ghost" disabled={page >= maxPage} onClick={() => goPage(page + 1)}>Suivant</button>
      </div>

      {/* Modal détail */}
      {openId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-md border border-white/10 bg-zinc-900 text-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="font-semibold">Détails de la commande #{openId}</div>
              <div className="flex items-center gap-2">
                {detail?.status === "PAID" && (
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary !text-xs !px-2 !py-1 sm:!text-sm sm:!px-3 sm:!py-2"
                      disabled={marking}
                      onClick={async () => {
                        if (!openId) return;
                        const ok = window.confirm(
                          "Confirmer la réception ?\n\nEn confirmant, vous déclenchez le paiement du vendeur.\nSi vous constatez un souci (produit défectueux, incomplet, etc.), utilisez plutôt ‘Signaler un problème’ avant de confirmer."
                        );
                        if (!ok) return;
                        setMarking(true);
                        try {
                          const res = await fetch(`/api/marketplace/orders/${openId}/confirm-received`, { method: "POST" });
                          if (res.ok) {
                            mutate();
                            const r = await fetch(`/api/marketplace/my-orders/${openId}`);
                            const j = await r.json();
                            if (r.ok) setDetail(j.order);
                          }
                        } finally { setMarking(false); }
                      }}
                    >{marking ? "Validation…" : "Marquer reçu"}</button>

                    <button className="btn-ghost !text-xs !px-2 !py-1 sm:!text-sm sm:!px-3 sm:!py-2" onClick={() => { setShowInlineHandOver((s) => !s); setHandOverProof(null); }}>Remise en mains propres</button>
                  </div>
                )}
                <button className="btn-ghost" onClick={() => { setOpenId(null); setDetail(null); }}>Fermer</button>
              </div>
            </div>
            <div className="p-4 text-sm min-h-[180px] grid gap-4">
              {loading && <div className="text-white/70">Chargement…</div>}
              {!loading && detail && (
                <>
                  <div className="space-y-2">
                    <div><span className="text-white/60">Produit:</span> {detail.listing?.title || "—"}</div>
                    <div><span className="text-white/60">Vendeur:</span> {detail.seller?.name || detail.seller?.email || `#${detail.seller?.id}`}</div>
                    <div><span className="text-white/60">Prix:</span> {euros(detail.amountCents)} {detail.currency}</div>
                    {/* Suivi colis amélioré: afficher lien + numéro et boutons Copier */}
                    <div className="pt-1">
                      <div className="text-white/60">Suivi colis:</div>
                      {(detail.trackingUrl || detail.trackingNumber) ? (
                        <div className="mt-1 space-y-1">
                          {detail.trackingUrl && (
                            <div className="flex items-center gap-2">
                              <a className="text-[var(--accent)] hover:underline" href={detail.trackingUrl} target="_blank" rel="noreferrer">Voir le suivi</a>
                              <button onClick={() => copy(detail.trackingUrl, "link")} className="btn-ghost text-xs px-2 py-1">
                                {copied === "link" ? "Copié" : "Copier le lien"}
                              </button>
                            </div>
                          )}
                          {detail.trackingNumber && (
                            <div className="flex items-center gap-2">
                              <span>N° {detail.trackingNumber}</span>
                              <button onClick={() => copy(detail.trackingNumber, "number")} className="btn-ghost text-xs px-2 py-1">
                                {copied === "number" ? "Copié" : "Copier le N°"}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-white/60">—</div>
                      )}
                    </div>
                    {/* Inline hand-over card */}
                    {showInlineHandOver && (
                      <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
                        <div className="font-semibold mb-2">Remise en mains propres</div>
                        <div className="text-sm text-white/70 mb-2">Confirmez la réception et, si vous le souhaitez, ajoutez une photo comme preuve.</div>
                        <div className="grid gap-2">
                          <label className="block text-sm">Photo preuve (facultatif)</label>
                          <div className="flex items-center gap-3">
                            <label className="btn-ghost inline-flex items-center gap-2 cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const f = (e.target as HTMLInputElement).files?.[0];
                                if (!f) { setHandOverProof(null); setHandOverPreview(null); setHandOverFileName(null); setHandOverFileSize(null); setHandOverFileTooLarge(false); return; }
                                const max = 5 * 1024 * 1024; // 5MB
                                setHandOverFileName(f.name);
                                setHandOverFileSize(f.size);
                                setHandOverFileTooLarge(f.size > max);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const res = reader.result as string;
                                  const idx = res.indexOf(',');
                                  setHandOverProof(idx >= 0 ? res.slice(idx + 1) : res);
                                  setHandOverPreview(res);
                                };
                                reader.readAsDataURL(f);
                              }} />
                              <span>Choisir une photo</span>
                            </label>
                            {handOverPreview && (
                              <img src={handOverPreview} alt="aperçu" className="h-16 w-16 object-cover rounded border border-white/10" />
                            )}
                            <div className="text-xs text-white/60">
                              {handOverFileName ? (
                                <div>{handOverFileName} • {handOverFileSize ? `${(handOverFileSize/1024).toFixed(0)} KB` : ''}</div>
                              ) : <div className="italic">Aucune photo ajoutée</div>}
                              {handOverFileTooLarge && <div className="text-red-400">Fichier trop volumineux (max 5MB)</div>}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button className="btn-ghost" onClick={() => { setShowInlineHandOver(false); setHandOverProof(null); }}>Annuler</button>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={async () => {
                              if (!openId) return;
                              try {
                                setMarkingHandOver(true);
                                let proofProtectedId: string | null = null;

                                // If we have a selected file and it's not too large, upload it to protected endpoint first
                                if (handOverFileName && handOverPreview && !handOverFileTooLarge) {
                                  const respFileInput = (document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement | null);
                                  const file = respFileInput?.files?.[0] ?? null;
                                  if (file) {
                                    const form = new FormData();
                                    form.append('file', file);
                                    const up = await fetch('/api/uploads/protected', { method: 'POST', body: form });
                                    if (up.ok) {
                                      const j = await up.json();
                                      if (Array.isArray(j.ids) && j.ids[0]) proofProtectedId = j.ids[0];
                                    } else {
                                      const err = await up.json().catch(() => null);
                                      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: err?.error || 'Erreur upload', type: 'error' } }));
                                      setMarkingHandOver(false);
                                      return;
                                    }
                                  }
                                }

                                const payload: any = {};
                                if (proofProtectedId) payload.proofProtectedId = proofProtectedId;

                                const res = await fetch(`/api/marketplace/orders/${openId}/confirm-received`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload),
                                });
                                if (res.ok) {
                                  const r = await fetch(`/api/marketplace/my-orders/${openId}`);
                                  const j = await r.json();
                                  if (r.ok) setDetail(j.order);
                                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Remise confirmée', type: 'success' } }));
                                  setShowInlineHandOver(false);
                                  setHandOverProof(null);
                                  setHandOverPreview(null);
                                  setHandOverFileName(null);
                                  setHandOverFileSize(null);
                                  setHandOverFileTooLarge(false);
                                  mutate();
                                } else {
                                  const j = await res.json().catch(() => null);
                                  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: j?.error || 'Erreur', type: 'error' } }));
                                }
                              } catch (err) {
                                console.error(err);
                                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erreur réseau', type: 'error' } }));
                              } finally { setMarkingHandOver(false); }
                            }}
                            disabled={markingHandOver || handOverFileTooLarge}
                            aria-busy={markingHandOver}
                            aria-disabled={markingHandOver || handOverFileTooLarge}
                            title={handOverFileTooLarge ? 'Le fichier est trop volumineux (max 5MB)' : 'Confirmer la remise'}
                          >
                            {markingHandOver ? 'Validation…' : (handOverFileTooLarge ? 'Fichier trop lourd' : 'Confirmer')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SAV: signaler un problème / demander un retour */}
                  <div className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold mb-2">Aide & retours</div>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      <label className={`px-3 py-1 rounded-full border ${caseKind === "ISSUE" ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10"}`}>
                        <input type="radio" className="sr-only" checked={caseKind === "ISSUE"} onChange={() => setCaseKind("ISSUE")} />
                        Signaler un problème (produit défectueux, incomplet…)
                      </label>
                      <label className={`px-3 py-1 rounded-full border ${caseKind === "RETURN" ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10"}`}>
                        <input type="radio" className="sr-only" checked={caseKind === "RETURN"} onChange={() => setCaseKind("RETURN")} />
                        Demander un retour / remboursement
                      </label>
                    </div>
                    <div className="grid gap-2">
                      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison courte (ex: écran fissuré, ne s'allume pas)" className="rounded-md border border-white/10 bg-black/20 px-3 py-2" maxLength={180} />
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez le souci ou la raison du retour avec le plus de détails possible" className="rounded-md border border-white/10 bg-black/20 px-3 py-2 min-h-[90px]" maxLength={4000} />
                      <div>
                        <label className="btn-ghost inline-flex items-center gap-2">
                          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                          Ajouter des photos
                        </label>
                        {photos.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {photos.map((u, i) => (
                              <div key={i} className="relative">
                                <img src={u} alt="photo" className="h-20 w-full object-cover rounded border border-white/10" />
                                <button className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 border border-white/10" onClick={() => setPhotos((p) => p.filter((x) => x !== u))}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button disabled={submitting} onClick={submitCase} className="btn-primary">Envoyer la demande</button>
                      </div>
                      <div className="text-xs text-white/50">Conseil: en cas de produit défectueux, nous recommandons d’envoyer des photos/vidéos. Le vendeur pourra vous fournir une étiquette retour si nécessaire.</div>
                    </div>
                  </div>

                  {/* Cas existants */}
                  {Array.isArray(detail.cases) && detail.cases.length > 0 && (
                    <div className="rounded-md border border-white/10 bg-black/10 p-3">
                      <div className="font-semibold mb-2">Vos demandes</div>
                      <ul className="grid gap-2">
                        {detail.cases.map((c: any) => (
                          <li key={c.id} className="rounded border border-white/10 p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm">{c.kind === "RETURN" ? "Retour" : "Problème"} • <span className="text-white/60">{new Date(c.createdAt).toLocaleString("fr-FR")}</span></div>
                              <div className="text-xs uppercase text-white/60">{c.status}</div>
                            </div>
                            {c.reason && <div className="text-sm mt-1">{c.reason}</div>}
                            {c.description && <div className="text-xs text-white/60 mt-1 whitespace-pre-wrap">{c.description}</div>}
                            {Array.isArray(c.photos) && c.photos.length > 0 && (
                              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {c.photos.map((u: string, i: number) => (
                                  <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} className="h-16 w-full object-cover rounded border border-white/10" /></a>
                                ))}
                              </div>
                            )}
                            {(c.returnTrackingUrl || c.returnTrackingNumber) && (
                              <div className="mt-2 text-xs">
                                <div className="text-white/60">Suivi du retour:</div>
                                {c.returnTrackingUrl && <a className="text-[var(--accent)] hover:underline" href={c.returnTrackingUrl} target="_blank">Lien</a>}
                                {c.returnTrackingNumber && <div>N° {c.returnTrackingNumber}</div>}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
