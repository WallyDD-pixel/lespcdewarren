"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { getShippingRates, getSupportedCountries, toISO2 } from "@/lib/shipping";
import { useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const { items, totalCents } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const listingIdParam = searchParams.get("listingId");
  const [mpListing, setMpListing] = useState<any | null>(null);
  const isMarketplace = !!listingIdParam && !!mpListing;

  // Charger l'annonce marketplace si listingId est présent
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!listingIdParam) { setMpListing(null); return; }
      try {
        const res = await fetch(`/api/marketplace/listings/${listingIdParam}`);
        const j = await res.json();
        if (!alive) return;
        setMpListing(j?.listing || null);
      } catch {
        if (alive) setMpListing(null);
      }
    })();
    return () => { alive = false; };
  }, [listingIdParam]);

  // Prefill from user profile via API
  const [isAuthed, setIsAuthed] = useState(false);
  const [profile, setProfile] = useState<{
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    zip?: string;
    city?: string;
    country?: string;
    phone?: string;
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setIsAuthed(true);
          setUserEmail(data?.user?.email || "");
          const p = data?.user?.profile || {};
          setProfile({
            firstName: p.firstName,
            lastName: p.lastName,
            address1: p.address1,
            address2: p.address2,
            zip: p.zip,
            city: p.city,
            country: p.country,
            phone: p.phone,
          });
        } else {
          setIsAuthed(false);
          setUserEmail("");
        }
      } catch {
        setIsAuthed(false);
        setUserEmail("");
      }
    })();
  }, []);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    country: "France",
    phone: "",
  });

  // Address mode: use saved or enter new
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [savedCountry, setSavedCountry] = useState<string | null>(null);

  // Étapes du checkout: toujours commencer par l'adresse (y compris marketplace)
  const [step, setStep] = useState<"address" | "card">("address");

  // Autocomplétion d'adresse via Google Places
  const [addrSuggestions, setAddrSuggestions] = useState<Array<{ label: string; placeId: string }>>([]);
  const [addrFocus, setAddrFocus] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const addrTimer = useRef<any>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const gAutoSvcRef = useRef<any>(null);
  const gPlaceSvcRef = useRef<any>(null);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        firstName: profile.firstName || f.firstName,
        lastName: profile.lastName || f.lastName,
        address1: profile.address1 || f.address1,
        address2: profile.address2 || f.address2,
        zip: profile.zip || f.zip,
        city: profile.city || f.city,
        country: profile.country || f.country,
        phone: profile.phone || f.phone,
      }));
    }
  }, [profile]);

  // Default address mode: if no saved address, force new
  useEffect(() => {
    if (!profile || !profile.address1) setAddressMode("new");
  }, [profile]);

  // Compute current shipping address source early (inutile en marketplace mais conservé)
  const shippingFrom = useMemo(() => {
    if (addressMode === "saved" && profile) {
      return { ...profile, country: savedCountry || profile.country } as any;
    }
    return form as any;
  }, [addressMode, profile, form, savedCountry]);

  // Charger Google Maps JS API (Places)
  useEffect(() => {
    const win: any = window as any;
    if (win.google?.maps?.places) {
      setGoogleReady(true);
      gAutoSvcRef.current = new win.google.maps.places.AutocompleteService();
      gPlaceSvcRef.current = new win.google.maps.places.PlacesService(document.createElement("div"));
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!key) return; // clé manquante, pas d'autocomplétion Google
    const existing = document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]');
    if (existing) return; // déjà en cours/chargé
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

  // Suggestions Google Places quand le champ Adresse est focalisé
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

  // Totaux: basés sur le panier (store) ou l’annonce (marketplace)
  const baseTotal = useMemo(() => (isMarketplace ? (mpListing?.priceCents || 0) : totalCents()), [isMarketplace, mpListing, items, totalCents]);

  const [shippingRates, setShippingRates] = useState<Array<{ id: string; label: string; priceCents: number; carrier: string; etaDays: number }>>([]);
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(null);

  useEffect(() => {
    // Calcule les tarifs de livraison pour tous les modes (boutique & marketplace)
    const addr = { country: (shippingFrom as any).country, zip: (shippingFrom as any).zip, city: (shippingFrom as any).city };
    const rates = getShippingRates(addr, baseTotal);
    setShippingRates(rates);
    if (!shippingMethodId || !rates.find((r) => r.id === shippingMethodId)) {
      setShippingMethodId(rates[0]?.id || null);
    }
  }, [shippingFrom, baseTotal]);

  const shippingPrice = useMemo(() => (shippingRates.find((r) => r.id === shippingMethodId)?.priceCents || 0), [shippingRates, shippingMethodId]);
  const grandTotal = useMemo(() => baseTotal + shippingPrice, [baseTotal, shippingPrice]);
  const selectedShippingRate = useMemo(() => shippingRates.find((r) => r.id === shippingMethodId) || null, [shippingRates, shippingMethodId]);

  const fmt = (cents: number) => (cents / 100).toFixed(2) + " €";

  // Nom complet pour l’adresse d’expédition
  const fullName = useMemo(
    () => `${shippingFrom.firstName ?? ""} ${shippingFrom.lastName ?? ""}`.trim(),
    [shippingFrom.firstName, shippingFrom.lastName]
  );

  // Validation adresse + email invité (désormais aussi en marketplace)
  const validate = () => {
    const { firstName, lastName, address1, zip, city, country, phone } = shippingFrom as any;
    if (!firstName || !lastName || !address1 || !zip || !city || !country || !phone) return "Veuillez remplir tous les champs obligatoires.";
    const zipOk = /^\d{4,6}$/.test(zip as string) || /^[A-Za-z0-9\-\s]{3,10}$/.test(zip as string);
    if (!zipOk) return "Code postal invalide.";
    if (!shippingMethodId) return "Choisissez un mode de livraison.";
    if (!isAuthed) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail);
      if (!emailOk) return "Email invalide.";
    }
    // Validation simple du téléphone (au moins 8 chiffres/caractères)
    if (!/^[+0-9 ()-]{8,}$/.test(phone)) return "Numéro de téléphone invalide.";
    return null;
  };

  // ===== Stripe Checkout (redirection vers Stripe) =====
  const [stripeLoading, setStripeLoading] = useState(false);

  // ===== Paiement sur place =====
  const [paymentMode, setPaymentMode] = useState<"stripe" | "onsite">("stripe");
  const [customerInstagram, setCustomerInstagram] = useState("");
  const [customerSnapchat, setCustomerSnapchat] = useState("");
  const [onsiteLoading, setOnsiteLoading] = useState(false);

  const goToCardStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    try {
      if (isAuthed && saveToProfile && addressMode === "new") {
        await fetch("/api/account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            address1: form.address1,
            address2: form.address2,
            zip: form.zip,
            city: form.city,
            country: form.country,
          }),
        });
        setSavedMsg("Adresse enregistrée dans votre compte.");
      }
      setStep("card");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const payWithStripe = async () => {
    setError(null);
    if (isMarketplace && !isAuthed) { setError("Connectez-vous pour payer cette annonce."); return; }
    const validationError = validate();
    if (validationError) return setError(validationError);

    setStripeLoading(true);
    try {
      const shippingPayload = {
        name: fullName,
        addr1: (shippingFrom as any).address1,
        addr2: (shippingFrom as any).address2 || "",
        zip: (shippingFrom as any).zip,
        city: (shippingFrom as any).city,
        country: (shippingFrom as any).country,
        phone: (shippingFrom as any).phone || "",
      };

      if (isMarketplace && listingIdParam) {
        const res = await fetch("/api/stripe/marketplace/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: Number(listingIdParam),
            shippingMethodId,
            shipping: shippingPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Impossible de créer la session de paiement");
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("URL de paiement manquante");
      }

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shipping: shippingPayload,
          shippingMethodId,
          email: userEmail,
          isMarketplace: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Impossible de créer la session de paiement");
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("URL de paiement manquante");
    } catch (e: any) {
      setError(e?.message || "Paiement échoué");
    } finally {
      setStripeLoading(false);
    }
  };

  const confirmOnsiteOrder = async () => {
    setError(null);
    const err = validate();
    if (err) return setError(err);
    setOnsiteLoading(true);
    try {
      const shippingPayload = {
        name: fullName,
        addr1: (shippingFrom as any).address1,
        addr2: (shippingFrom as any).address2 || "",
        zip: (shippingFrom as any).zip,
        city: (shippingFrom as any).city,
        country: (shippingFrom as any).country,
      };
      const res = await fetch("/api/orders/create-onsite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? undefined,
            quantity: i.quantity,
          })),
          shipping: shippingPayload,
          shippingMethodId,
          email: userEmail,
          customerInstagram: customerInstagram.trim() || undefined,
          customerSnapchat: customerSnapchat.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Impossible d'enregistrer la commande");
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      throw new Error("Réponse invalide");
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setOnsiteLoading(false);
    }
  };

  // Icônes des cartes acceptées (Stripe)
  const AcceptedCards = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
      <span className="mr-1">Cartes acceptées (Stripe):</span>
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

  const countriesByRegion = useMemo(() => {
    const list = getSupportedCountries();
    const map = new Map<string, Array<{ code: string; label: string }>>();
    list.forEach((x) => {
      if (!map.has(x.region)) map.set(x.region, []);
      map.get(x.region)!.push({ code: x.code, label: x.label });
    });
    map.forEach((arr) => arr.sort((a, b) => a.label.localeCompare(b.label)));
    return Array.from(map.entries());
  }, []);

  // Si panier vide et pas d’annonce marketplace => message vide
  if (!items.length && !isMarketplace) {
    return (
      <main className="container py-10">
        <div className="card p-6">
          <p>Votre panier est vide.</p>
          <div className="mt-4"><Link className="btn-primary" href="/">Retour à l&apos;accueil</Link></div>
        </div>
      </main>
    );
  }

  // Items à afficher dans le résumé
  const itemsView: Array<{ key: string; name: string; quantity: number; priceCents: number }> = isMarketplace
    ? (mpListing ? [{ key: `mp-${mpListing.id}`, name: mpListing.title, quantity: 1, priceCents: mpListing.priceCents }] : [])
    : items.map((i) => ({ key: `${i.productId}-${i.variantId ?? 0}`, name: i.name, quantity: i.quantity, priceCents: i.priceCents }));

  return (
    <main className="container py-6 md:py-10">
      {/* Lien retour au panier retiré en phase de validation */}
      <h1 className="text-2xl font-bold mb-6">Validation</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: address + card steps */}
        <section className="md:col-span-2 space-y-4">
          {/* Vendeur (marketplace) */}
          {isMarketplace && mpListing && (
            <div className="card p-5">
              <div className="text-sm font-semibold mb-2">Vendeur</div>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
                  {(mpListing.seller?.name || "V").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{mpListing.seller?.name || "Vendeur"}</div>
                  {(mpListing.city || mpListing.zip) ? (
                    <div className="text-xs text-gray-400 truncate">{[mpListing.city, mpListing.zip].filter(Boolean).join(" ")}</div>
                  ) : null}
                  {mpListing.seller?.createdAt ? (
                    <div className="text-xs text-gray-400">Membre depuis {new Date(mpListing.seller.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 text-xs text-white/70">
                Vous achetez cet article auprès d’un vendeur du marketplace. Le vendeur sera notifié après paiement.
              </div>
            </div>
          )}

          {/* Adresse de livraison (affichée aussi en marketplace) */}
          {step === "address" && (
            <div className="card p-5 space-y-3">
              <h2 className="font-semibold">Adresse de livraison</h2>
              {profile?.address1 ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="addrMode"
                      className="accent-[var(--accent)]"
                      checked={addressMode === "saved"}
                      onChange={() => setAddressMode("saved")}
                    />
                    <span>Utiliser l'adresse enregistrée</span>
                  </label>
                  {addressMode === "saved" && (
                    <div className="ml-7 text-sm text-white/90 space-y-1">
                      <div className="font-medium">{profile.firstName} {profile.lastName}</div>
                      <div>{profile.address1}</div>
                      {profile.address2 && <div>{profile.address2}</div>}
                      <div>{profile.zip} {profile.city}</div>
                      <div>{profile.country}</div>
                    </div>
                  )}
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="addrMode"
                      className="accent-[var(--accent)]"
                      checked={addressMode === "new"}
                      onChange={() => setAddressMode("new")}
                    />
                    <span>Saisir une nouvelle adresse</span>
                  </label>
                </div>
              ) : (
                <p className="text-sm text-white/70">Aucune adresse enregistrée. Veuillez saisir votre adresse ci-dessous.</p>
              )}
            </div>
          )}

          {step === "address" && addressMode === "new" && (
            <form onSubmit={goToCardStep} className="card p-5 space-y-3">
              <h2 className="font-semibold">Nouvelle adresse</h2>

              {/* Email */}
              <input
                type="email"
                className="input"
                placeholder="Email"
                value={userEmail}
                onChange={(e)=> setUserEmail(e.target.value)}
                required={!isAuthed}
                disabled={isAuthed}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <input className="input" placeholder="Prénom" value={form.firstName} onChange={(e)=>setForm({...form, firstName:e.target.value})} required />
                <input className="input" placeholder="Nom" value={form.lastName} onChange={(e)=>setForm({...form, lastName:e.target.value})} required />
              </div>
              <input
                className="input"
                placeholder="Téléphone (obligatoire)"
                type="tel"
                value={form.phone}
                onChange={(e)=>setForm({...form, phone:e.target.value})}
                required
                pattern="[0-9+\s\-]{8,}"
                // Le champ reste toujours modifiable, même si le profil contient un numéro
              />
              <div className="relative">
                <input
                  className="input"
                  placeholder="Adresse"
                  value={form.address1}
                  onChange={(e)=>setForm({...form, address1:e.target.value})}
                  onFocus={() => setAddrFocus(true)}
                  onBlur={() => setTimeout(() => setAddrFocus(false), 120)}
                  autoComplete="street-address"
                  required
                />
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
                               setForm((f)=>({
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
              <input className="input" placeholder="Complément (optionnel)" value={form.address2} onChange={(e)=>setForm({...form, address2:e.target.value})} />
              <div className="grid sm:grid-cols-3 gap-3">
                <input className="input" placeholder="Code postal" value={form.zip} onChange={(e)=>setForm({...form, zip:e.target.value})} required />
                <input className="input" placeholder="Ville" value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} required />
                <select
                  className="input"
                  value={form.country}
                  onChange={(e)=>setForm({...form, country: e.target.value})}
                  required
                  aria-label="Pays"
                >
                  <option value="">Sélectionnez un pays</option>
                  {countriesByRegion.map(([region, arr]) => (
                    <optgroup key={region} label={region}>
                      {arr.map((o) => (
                        <option key={o.code} value={o.label}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {isAuthed && (
                <label className="mt-1 flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" className="accent-[var(--accent)]" checked={saveToProfile} onChange={(e)=>setSaveToProfile(e.target.checked)} />
                  Enregistrer cette adresse dans mon compte
                </label>
              )}

              {/* Choix du mode de livraison (désormais visible aussi pour marketplace) */}
              <div className="mt-2">
                <h3 className="font-medium mb-2">Mode de livraison</h3>
                {/* Option large pour retrait en main propre (unique) */}
                <button
                  type="button"
                  onClick={() => setShippingMethodId(shippingMethodId === 'pickup-local' ? (shippingRates[0]?.id || null) : 'pickup-local')}
                  className={`w-full text-left flex items-center justify-between gap-3 rounded-lg p-4 mb-3 cursor-pointer transition-shadow ${shippingMethodId === 'pickup-local' ? 'ring-2 ring-[var(--accent)] bg-white/5' : 'border-2 border-white/10 hover:shadow-lg'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${shippingMethodId === 'pickup-local' ? 'bg-[var(--accent)] text-black' : 'bg-white/10'}`}>
                      {shippingMethodId === 'pickup-local' ? <span className="text-sm">✓</span> : <span className="text-sm">○</span>}
                    </div>
                    <div>
                      <div className="font-semibold">Retrait en main propre</div>
                      <div className="text-sm text-white/80">61 rue de Paris, 95120</div>
                    </div>
                  </div>
                  <div className="font-semibold">Gratuit</div>
                </button>
                {shippingRates.length === 0 ? (
                  <p className="text-sm text-white/70">Renseignez une adresse pour voir les tarifs.</p>
                ) : (
                  <div className="space-y-2">
                    {shippingRates.map((r) => (
                      <label key={r.id} className="flex items-center justify-between gap-3 rounded border border-white/10 p-3 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shippingMethod"
                            checked={shippingMethodId === r.id}
                            onChange={() => setShippingMethodId(r.id)}
                          />
                          <span>{r.label} · {r.carrier} · {r.etaDays}j</span>
                        </span>
                        <span className="font-semibold">{fmt(r.priceCents)}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-sm text-white/80">
                  <div>Sous-total: {fmt(baseTotal)}</div>
                  <div>Livraison: {fmt(shippingPrice)}</div>
                  <div className="font-semibold">Total: {fmt(grandTotal)}</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="submit" disabled={loading} className="btn-primary">Continuer vers le paiement</button>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>
          )}

          {step === "address" && addressMode === "saved" && (
            <form onSubmit={goToCardStep} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Confirmer l'adresse enregistrée</h2>
                <button type="button" onClick={()=>setAddressMode("new")} className="text-sm text-[var(--accent)] hover:underline">Modifier / utiliser une autre</button>
              </div>
              {/* Résumé de l'adresse enregistrée */}
              <div className="font-medium">{profile?.firstName} {profile?.lastName}</div>
              <div>{profile?.address1}</div>
              {profile?.address2 && <div>{profile?.address2}</div>}
              <div>{profile?.zip} {profile?.city}</div>
              <div>{profile?.country}</div>
              {/* Show email field (disabled) when authenticated, for clarity */}
              <div>
                <label className="text-sm font-medium text-white/80">Email</label>
                <input type="email" className="input mt-1" value={userEmail} disabled />
              </div>

              {/* Choix du mode de livraison (désormais visible aussi pour marketplace) */}
              <div className="mt-2">
                <h3 className="font-medium mb-2">Mode de livraison</h3>
                {shippingRates.length === 0 ? (
                  <p className="text-sm text-white/70">Renseignez une adresse pour voir les tarifs.</p>
                ) : (
                  <div className="space-y-2">
                    {shippingRates.map((r) => (
                      <label key={r.id} className="flex items-center justify-between gap-3 rounded border border-white/10 p-3 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shippingMethodSaved"
                            checked={shippingMethodId === r.id}
                            onChange={() => setShippingMethodId(r.id)}
                          />
                          <span>{r.label} · {r.carrier} · {r.etaDays}j</span>
                        </span>
                        <span className="font-semibold">{fmt(r.priceCents)}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-sm text-white/80">
                  <div>Sous-total: {fmt(baseTotal)}</div>
                  <div>Livraison: {fmt(shippingPrice)}</div>
                  <div className="font-semibold">Total: {fmt(grandTotal)}</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button disabled={loading} className="btn-primary">Continuer vers le paiement</button>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>
          )}

          {step === "card" && (
            (isMarketplace && !isAuthed) ? (
              <div className="card p-5 space-y-3">
                <h2 className="font-semibold">Connexion requise</h2>
                <p className="text-sm text-white/80">Vous devez être connecté pour payer une annonce du marketplace.</p>
                <div>
                  <Link
                    className="btn-primary"
                    href={`/login?next=${encodeURIComponent(`/checkout${listingIdParam ? `?listingId=${listingIdParam}` : ''}`)}`}
                  >
                    Se connecter
                  </Link>
                </div>
              </div>
            ) : (
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold">Paiement</h2>

                {!isMarketplace && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("stripe")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${paymentMode === "stripe" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-white/80 hover:bg-white/15"}`}
                    >
                      Carte bancaire (Stripe)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode("onsite")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${paymentMode === "onsite" ? "bg-[var(--accent)] text-black" : "bg-white/10 text-white/80 hover:bg-white/15"}`}
                    >
                      Paiement sur place
                    </button>
                  </div>
                )}

                {paymentMode === "stripe" ? (
                  <>
                    <p className="text-sm text-white/70">Transaction sécurisée via Stripe (3D Secure). Vous serez redirigé vers la page de paiement Stripe.</p>
                    <div className="-mt-1"><AcceptedCards /></div>
                    <p className="text-xs text-white/60 mt-1">
                      En cas de problème de paiement, merci de me contacter par email à{" "}
                      <span className="font-medium">wallydibombepro@gmail.com</span>, sur Instagram{" "}
                      <span className="font-medium">@warrenoff</span> ou sur Snapchat{" "}
                      <span className="font-medium">@warrenofff</span>.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button type="button" onClick={() => setStep("address")} className="btn-secondary order-2 sm:order-1">Retour</button>
                      <button
                        type="button"
                        disabled={stripeLoading}
                        onClick={payWithStripe}
                        className="btn-primary order-1 sm:order-2"
                      >
                        {stripeLoading ? "Redirection vers Stripe..." : "Payer avec Stripe (carte bancaire)"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/80">
                      Vous pouvez vous déplacer pour payer directement sur place en <strong>espèces</strong> ou par <strong>virement instantané</strong>. Nous vous recontacterons via vos réseaux pour convenir du rendez-vous.
                    </p>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2">
                      <div className="text-sm font-medium text-white/90">Me contacter</div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span>Snapchat : <span className="font-semibold text-[var(--accent)]">warren_offf</span></span>
                        <span>Instagram : <span className="font-semibold text-[var(--accent)]">warrenofff</span></span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-white/90">Vos réseaux (pour vous recontacter)</div>
                      <input
                        type="text"
                        className="input"
                        placeholder="Votre Instagram (ex: @votrepseudo)"
                        value={customerInstagram}
                        onChange={(e) => setCustomerInstagram(e.target.value)}
                      />
                      <input
                        type="text"
                        className="input"
                        placeholder="Votre Snapchat (ex: @votrepseudo)"
                        value={customerSnapchat}
                        onChange={(e) => setCustomerSnapchat(e.target.value)}
                      />
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button type="button" onClick={() => setStep("address")} className="btn-secondary order-2 sm:order-1">Retour</button>
                      <button
                        type="button"
                        disabled={onsiteLoading}
                        onClick={confirmOnsiteOrder}
                        className="btn-primary order-1 sm:order-2"
                      >
                        {onsiteLoading ? "Enregistrement..." : "Confirmer la commande (paiement sur place)"}
                      </button>
                    </div>
                  </>
                )}

                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
              </div>
            )
          )}
        </section>

        {/* Right: summary */}
        <aside className="card p-5 h-max sticky top-4">
          {isMarketplace && step === "card" && mpListing && (
            <div className="mb-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold mb-2">Vendeur</div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
                  {(mpListing.seller?.name || "V").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{mpListing.seller?.name || "Vendeur"}</div>
                  {(mpListing.city || mpListing.zip) ? (
                    <div className="text-xs text-gray-400 truncate">{[mpListing.city, mpListing.zip].filter(Boolean).join(" ")}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>Le vendeur est notifié après le paiement.</span>
                <Link href={`/marketplace/${mpListing.id}`} className="underline">Voir l'annonce</Link>
              </div>
            </div>
          )}
          <div className="mb-3">
            <h3 className="font-semibold mb-2">Votre commande</h3>
            <ul className="space-y-2 text-sm">
              {itemsView.map((i) => (
                <li key={i.key} className="flex items-center justify-between">
                  <span className="text-white/80 line-clamp-1 pr-2">{i.name} × {i.quantity}</span>
                  <span className="font-medium">{fmt(i.priceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Sous-total</span>
              <span className="">{fmt(baseTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{`Livraison${selectedShippingRate ? ` (${selectedShippingRate.label})` : ""}`}</span>
              <span className="">{fmt(shippingPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Total</span>
              <span className="font-semibold">{fmt(grandTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Paiement sécurisé par Stripe (CB, 3D Secure).</p>
        </aside>
      </div>
    </main>
  );
}
