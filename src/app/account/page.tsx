"use client";
import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toISO2 } from "@/lib/shipping";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AccountPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/account", fetcher);
  const u = data?.user;
  const orders = data?.recentOrders || [];

  type FormState = {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string;
    zip: string;
    city: string;
    department: string;
    country: string;
  };

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  // Profile edit form state
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    department: "",
    country: "France",
  });
  // Order details modal state
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);

  // Autocomplétion Google Places (modal édition)
  const [addrSuggestions, setAddrSuggestions] = useState<Array<{ label: string; placeId: string }>>([]);
  const [addrFocus, setAddrFocus] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const addrTimer = useRef<any>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const gAutoSvcRef = useRef<any>(null);
  const gPlaceSvcRef = useRef<any>(null);

  useEffect(() => {
    const win: any = window as any;
    if (win.google?.maps?.places) {
      setGoogleReady(true);
      gAutoSvcRef.current = new win.google.maps.places.AutocompleteService();
      gPlaceSvcRef.current = new win.google.maps.places.PlacesService(document.createElement("div"));
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!key) return;
    const existing = document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]');
    if (existing) return;
    const script = document.createElement("script");
    const params = new URLSearchParams({ key, libraries: "places", language: "fr" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      setGoogleReady(true);
      gAutoSvcRef.current = new win.google.maps.places.AutocompleteService();
      gPlaceSvcRef.current = new win.google.maps.places.PlacesService(document.createElement("div"));
    };
    script.onerror = () => { setGoogleReady(false); };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!addrFocus) return;
    if (!googleReady || !gAutoSvcRef.current) { setAddrSuggestions([]); return; }
    const q = (form.address1 || "").trim();
    if (q.length < 3) { setAddrSuggestions([]); return; }
    if (addrTimer.current) clearTimeout(addrTimer.current);
    setAddrLoading(true);
    addrTimer.current = setTimeout(() => {
      try {
        const win: any = window as any;
        const iso2 = toISO2(form.country || "") || undefined;
        gAutoSvcRef.current.getPlacePredictions(
          {
            input: q,
            types: ["address"],
            ...(iso2 ? { componentRestrictions: { country: iso2 } } : {}),
          },
          (preds: any[], status: any) => {
            if (status !== win.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(preds)) {
              setAddrSuggestions([]);
            } else {
              setAddrSuggestions(preds.map((p: any) => ({ label: p.description, placeId: p.place_id })));
            }
            setAddrLoading(false);
          }
        );
      } catch {
        setAddrLoading(false);
      }
    }, 250);
    return () => { if (addrTimer.current) clearTimeout(addrTimer.current); };
  }, [form.address1, form.country, addrFocus, googleReady]);

  const fmtCurrency = (currency: string, cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format((cents || 0) / 100);
  const publicRefFrom = (id: number, createdAt?: string | Date) => {
    const d = new Date(createdAt || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `CMD-${y}${m}${day}-${String(id).padStart(6, "0")}`;
  };

  const statusFr = (s: string) => {
    switch (s) {
      case "PENDING": return "En attente";
      case "PAYMENT_RECEIVED": return "Paiement reçu";
      case "PREPARING": return "En préparation";
      case "SHIPPED": return "Expédiée";
      case "DELIVERED": return "Livrée";
      case "PAID": return "Payé";
      case "CANCELED": return "Annulée";
      case "REFUNDED": return "Remboursée";
      default: return s;
    }
  };

  useEffect(() => {
    if (!u) return;
    setForm({
      firstName: u?.profile?.firstName || "",
      lastName: u?.profile?.lastName || "",
      phone: u?.profile?.phone || "",
      address1: u?.profile?.address1 || "",
      address2: u?.profile?.address2 || "",
      zip: u?.profile?.zip || "",
      city: u?.profile?.city || "",
      department: u?.profile?.department || "",
      country: u?.profile?.country || "France",
    });
  }, [u]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setOrderOpen(false); } };
    if (open || orderOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderOpen]);

  const input = "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]";
  const label = "block text-sm mb-1";

  const onChange = (k: keyof FormState) => (e: any) => setForm((f: FormState) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      await mutate();
      setOpen(false);
    } catch (e) {
      // noop minimal UX
    } finally {
      setSaving(false);
    }
  };

  const viewOrder = async (orderId: number) => {
    setOrderOpen(true);
    setOrderLoading(true);
    setOrderDetail(null);
    try {
      const res = await fetch(`/api/orders?id=${orderId}`);
      const j = await res.json();
      if (res.ok && Array.isArray(j.orders) && j.orders.length) setOrderDetail(j.orders[0]);
    } catch {}
    finally { setOrderLoading(false); }
  };

  // Icônes des cartes acceptées via PayPal
  const AcceptedCards = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
      <span className="mr-1">Cartes acceptées via PayPal:</span>
      {/* VISA */}
      <span className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-1" title="Visa">
        <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true" className="-ml-0.5">
          <rect x="0.5" y="0.5" width="35" height="15" rx="3" fill="#1A1F71" stroke="#1A1F71" />
          <text x="18" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">VISA</text>
        </svg>
        <span className="sr-only">Visa</span>
      </span>
      {/* Mastercard */}
      <span className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-1" title="Mastercard">
        <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true" className="-ml-0.5">
          <rect x="0.5" y="0.5" width="35" height="15" rx="3" fill="#111827" stroke="#111827" />
          <circle cx="15" cy="8" r="4.5" fill="#EB001B" />
          <circle cx="21" cy="8" r="4.5" fill="#F79E1B" />
        </svg>
        <span className="sr-only">Mastercard</span>
      </span>
      {/* American Express */}
      <span className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-1" title="American Express">
        <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true" className="-ml-0.5">
          <rect x="0.5" y="0.5" width="35" height="15" rx="3" fill="#2E77BB" stroke="#2E77BB" />
          <text x="18" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">AMEX</text>
        </svg>
        <span className="sr-only">American Express</span>
      </span>
      {/* CB (Carte Bancaire) */}
      <span className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-1" title="Carte Bancaire">
        <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true" className="-ml-0.5">
          <rect x="0.5" y="0.5" width="35" height="15" rx="3" fill="#016E6A" stroke="#016E6A" />
          <text x="18" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">CB</text>
        </svg>
        <span className="sr-only">Carte Bancaire</span>
      </span>
      {/* Discover */}
      <span className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-1" title="Discover">
        <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true" className="-ml-0.5">
          <rect x="0.5" y="0.5" width="35" height="15" rx="3" fill="#0B0F1A" stroke="#0B0F1A" />
          <text x="18" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">DISC</text>
        </svg>
        <span className="sr-only">Discover</span>
      </span>
    </div>
  );

  if (isLoading) return <main className="container py-10">Chargement...</main>;
  if (error || data?.error) return <main className="container py-10">Non authentifié</main>;

  const fullName = (u?.profile?.firstName || u?.name || "") + (u?.profile?.lastName ? ` ${u.profile.lastName}` : "");
  const addr = [u?.profile?.address1, u?.profile?.address2].filter(Boolean).join(" \u2022 ");
  const cityLine = [u?.profile?.zip, u?.profile?.city].filter(Boolean).join(" ");

  return (
    <main className="container py-10 space-y-6 px-4 md:px-0">
      <h1 className="text-2xl font-bold">Mon compte</h1>

      <section className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold mb-2">Informations personnelles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/60">Nom</div>
                <div className="font-medium truncate">{fullName || "-"}</div>
              </div>
              <div>
                <div className="text-white/60">Email</div>
                <div className="font-medium break-all">{u.email}</div>
              </div>
              <div>
                <div className="text-white/60">Téléphone</div>
                <div className="font-medium truncate">{u?.profile?.phone || "-"}</div>
              </div>
              <div>
                <div className="text-white/60">Adresse</div>
                <div className="font-medium break-words">{addr || "-"}</div>
                {cityLine && <div className="text-white/60">{cityLine}</div>}
                {u?.profile?.country && <div className="text-white/60">{u.profile.country}</div>}
              </div>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <button onClick={() => setOpen(true)} className="btn-cart rounded-md px-4 py-2 font-semibold">Modifier mes informations</button>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold mb-2">Vos paiements</h2>
        <div className="mb-4"><AcceptedCards /></div>
        {orders.length === 0 ? (
          <div className="text-white/60 text-sm">Aucun paiement récent.</div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o: any) => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm overflow-hidden">
                <div className="min-w-0 w-full space-y-0.5">
                  <div className="text-white/80 break-words">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency }).format(o.amountCents / 100)} • {new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
                  <div className="text-white/60 break-all">Référence: {publicRefFrom(o.id, o.createdAt)}</div>
                </div>
                <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 justify-between sm:justify-end sm:self-end">
                  <span className="text-white/70">
                    <a href={`/orders?id=${o.id}`} className="hover:underline text-[var(--accent)]">{statusFr(o.status)}</a>
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(publicRefFrom(o.id, o.createdAt))}
                    className="rounded-md border border-white/10 px-3 py-1 hover:bg-white/5"
                    title="Copier la référence"
                  >
                    Copier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold mb-4">Dernières commandes</h2>
        {orders.length === 0 ? (
          <div className="text-white/60 text-sm">Aucune commande.</div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o: any) => (
              <button
                type="button"
                key={o.id}
                onClick={() => viewOrder(o.id)}
                className="text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm overflow-hidden hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <div className="min-w-0 w-full space-y-0.5">
                  <div className="text-white/80 break-words">Commande n°{o.id}</div>
                  <div className="text-white/60 break-words">{new Date(o.createdAt).toLocaleDateString("fr-FR")} • {fmtCurrency(o.currency, o.amountCents)}</div>
                </div>
                <div className="text-white/70 w-full sm:w-auto sm:self-end text-right sm:text-left">
                  <a href={`/orders?id=${o.id}`} className="hover:underline text-[var(--accent)]">{statusFr(o.status)}</a>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="edit-profile-title" className="font-semibold">Modifier mes informations</h3>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="h-9 w-9 grid place-items-center rounded border border-white/10 hover:bg-white/5">✕</button>
            </div>
            <form onSubmit={onSave} className="p-5 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Prénom</label>
                  <input autoFocus className={input} value={form.firstName} onChange={onChange("firstName")} />
                </div>
                <div>
                  <label className={label}>Nom</label>
                  <input className={input} value={form.lastName} onChange={onChange("lastName")} />
                </div>
                <div>
                  <label className={label}>Téléphone</label>
                  <input className={input} value={form.phone} onChange={onChange("phone")} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <label className={label}>Adresse</label>
                  <input className={input} value={form.address1} onChange={onChange("address1")} onFocus={() => setAddrFocus(true)} onBlur={() => setTimeout(() => setAddrFocus(false), 120)} autoComplete="street-address" />
                  {addrFocus && ((addrLoading) || addrSuggestions.length > 0) && (
                    <div
                      className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-64 overflow-auto rounded-md border border-white/20 bg-black text-white shadow-2xl divide-y divide-white/10"
                      role="listbox"
                      aria-label="Suggestions d'adresse"
                    >
                      {addrLoading && <div className="px-3 py-2 text-xs text-white/80 bg-black">Recherche…</div>}
                      {addrSuggestions.map((s, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="block w-full text-left px-3 py-2 hover:bg-white/10 focus:bg-white/10 focus:outline-none text-sm whitespace-normal break-words"
                          role="option"
                          onMouseDown={(e)=> e.preventDefault()}
                          onClick={() => {
                            const win: any = window as any;
                            const svc = gPlaceSvcRef.current;
                            if (!svc) return;
                            setAddrLoading(true);
                            svc.getDetails({ placeId: s.placeId, fields: ["address_components"] }, (place: any, status: any) => {
                              setAddrLoading(false);
                              if (status !== win.google.maps.places.PlacesServiceStatus.OK || !place) {
                                setAddrSuggestions([]);
                                setAddrFocus(false);
                                return;
                              }
                              const comps = place.address_components || [];
                              const get = (type: string) => {
                                const c = comps.find((a: any) => a.types.includes(type));
                                return c ? { long: c.long_name, short: c.short_name } : null;
                              };
                              const num = get("street_number")?.long || "";
                              const route = get("route")?.long || "";
                              const address1 = `${num ? num + " " : ""}${route}`.trim();
                              const zip = get("postal_code")?.long || "";
                              const city = get("locality")?.long || get("postal_town")?.long || "";
                              const country = get("country")?.long || "";
                              setForm((f: FormState) => ({
                                ...f,
                                address1: address1 || f.address1,
                                zip: zip || f.zip,
                                city: city || f.city,
                                country: country || f.country,
                              }));
                              setAddrSuggestions([]);
                              setAddrFocus(false);
                            });
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                      <div className="px-3 py-1 text-[10px] text-white/70 bg-black">Suggestions par Google Places</div>
                    </div>
                  )}
                </div>
                <div>
                  <label className={label}>Complément</label>
                  <input className={input} value={form.address2} onChange={onChange("address2")} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Code postal</label>
                  <input className={input} value={form.zip} onChange={onChange("zip")} />
                </div>
                <div>
                  <label className={label}>Ville</label>
                  <input className={input} value={form.city} onChange={onChange("city")} />
                </div>
                <div>
                  <label className={label}>Département</label>
                  <input className={input} value={form.department} onChange={onChange("department")} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Pays</label>
                  <input className={input} value={form.country} onChange={onChange("country")} />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-white/10 px-4 py-2 hover:bg-white/5">Annuler</button>
                <button disabled={saving} className="btn-cart rounded-md px-5 py-2 font-semibold disabled:opacity-50">{saving ? "Enregistrement..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {orderOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOrderOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="order-detail-title" className="font-semibold">
                {orderDetail ? `Commande n°${orderDetail.id}` : "Détails de la commande"}
              </h3>
              <button onClick={() => setOrderOpen(false)} aria-label="Fermer" className="h-9 w-9 grid place-items-center rounded border border-white/10 hover:bg-white/5">✕</button>
            </div>
            <div className="p-5 grid gap-4 max-h-[75vh] overflow-auto">
              {orderLoading && <div className="text-white/70 text-sm">Chargement...</div>}
              {!orderLoading && orderDetail && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Statut</div>
                      <div className="font-medium">{orderDetail.status}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Montant</div>
                      <div className="font-medium">{fmtCurrency(orderDetail.currency, orderDetail.amountCents)}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Date</div>
                      <div className="font-medium">{new Date(orderDetail.createdAt).toLocaleString("fr-FR")}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                      <div className="text-white/60">Référence commande</div>
                      <div className="flex items-center gap-2 break-all">
                        <span className="font-medium">{publicRefFrom(orderDetail.id, orderDetail.createdAt)}</span>
                        <button onClick={() => navigator.clipboard.writeText(publicRefFrom(orderDetail.id, orderDetail.createdAt))} className="rounded border border-white/10 px-2 py-0.5 text-xs hover:bg-white/5">Copier</button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-black/20 p-3">
                    <h4 className="font-semibold mb-2 text-sm">Adresse de livraison</h4>
                    {orderDetail.shipping?.addr1 ? (
                      <div className="text-sm text-white/90 space-y-0.5">
                        {orderDetail.shipping?.name && <div className="font-medium">{orderDetail.shipping.name}</div>}
                        <div>{orderDetail.shipping.addr1}</div>
                        {orderDetail.shipping.addr2 && <div>{orderDetail.shipping.addr2}</div>}
                        <div>{orderDetail.shipping.zip} {orderDetail.shipping.city}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">—</div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Articles</h4>
                    <ul className="grid gap-2">
                      {orderDetail.items?.map((it: any) => (
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
                          <div className="text-sm font-medium whitespace-nowrap">{fmtCurrency(orderDetail.currency, it.priceCents * it.quantity)}</div>
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
    </main>
  );
}
