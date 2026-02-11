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

  // ===== PayPal Advanced (Hosted Fields) integration =====
  // clientToken: null = pas de token ou échec, string = token valide
  const [clientToken, setClientToken] = useState<string | null>(null);
  // tokenTried: indique qu'on a tenté de récupérer un token (même en cas d'erreur)
  const [tokenTried, setTokenTried] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [hfLoading, setHfLoading] = useState(false);
  const [hfReady, setHfReady] = useState(false);
  const hostedFieldsInstance = useRef<any>(null);
  const [processing, setProcessing] = useState(false);
  const [payLaterRendered, setPayLaterRendered] = useState(false);
  const marketplaceOrderIdRef = useRef<number | null>(null);
  const [paypalRendered, setPaypalRendered] = useState(false);

  // Preconnect to PayPal domains to speed up SDK load
  useEffect(() => {
    const head = document.head;
    const links: HTMLLinkElement[] = [];
    const add = (href: string) => {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "anonymous";
      head.appendChild(l);
      links.push(l);
    };
    add("https://www.paypal.com");
    add("https://www.paypalobjects.com");
    return () => { links.forEach((l) => l.remove()); };
  }, []);

  // Désactivé: génération de client token PayPal avancé.
  // On utilise uniquement les boutons PayPal standards (Wallet / PayLater).
  useEffect(() => {
    setClientToken(null);
    setTokenTried(true);
  }, []);

  // Load PayPal SDK une fois qu'on a tenté de récupérer un client token
  useEffect(() => {
    // On attend d'avoir essayé de récupérer un token (même si échec),
    // ainsi les boutons PayPal classiques fonctionnent même sans Hosted Fields.
    if (!tokenTried) return;
    if ((window as any).paypal) { setSdkReady(true); return; }

    async function load() {
      let clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
      try {
        const res = await fetch('/api/public-config', { cache: 'no-store' });
        const j = await res.json();
        if (j?.paypalClientId) clientId = j.paypalClientId;
      } catch {}

      if (!clientId) { console.error("NEXT_PUBLIC_PAYPAL_CLIENT_ID is missing"); setError("Configuration PayPal manquante (client id)"); return; }

      const existing = document.querySelector('script[src^="https://www.paypal.com/sdk/js"]');
      if (existing) existing.parentElement?.removeChild(existing);

      const script = document.createElement("script");
      const params = new URLSearchParams({
        "client-id": clientId,
        components: "hosted-fields,buttons",
        intent: "capture",
        currency: "EUR",
        locale: "fr_FR",
        "enable-funding": "paylater",
        "disable-funding": "card,credit",
        vault: "false",
      });
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      // On n'ajoute le client token que si on en a réellement un.
      if (clientToken) {
        script.setAttribute("data-client-token", clientToken);
      }

      setSdkLoading(true);
      script.onload = () => { setSdkLoading(false); setSdkReady(true); };
      script.onerror = () => { setSdkLoading(false); setError("Chargement du SDK PayPal échoué."); };

      document.body.appendChild(script);
    }

    load();
    return () => {
      const existing = document.querySelector('script[src^="https://www.paypal.com/sdk/js"]');
      existing?.parentElement?.removeChild(existing);
    };
  }, [clientToken, tokenTried]);

  // Render Hosted Fields when SDK is ready and step is card
  useEffect(() => {
    const win: any = window as any;
    if (step !== "card" || !sdkReady || !win.paypal?.HostedFields) return;
    if (isMarketplace && !isAuthed) return; // Bloque Hosted Fields pour invités en marketplace
    if (hostedFieldsInstance.current) return;

    // Rendre les Hosted Fields (paiement par carte via PayPal)
    console.log("PayPal SDK loaded, rendering Hosted Fields for card payment...");

    setHfLoading(true);
    setHfReady(false);
    win.paypal.HostedFields.render({
      styles: { 
        ".valid": { color: "#10b981" },
        ".invalid": { color: "#ef4444" },
        input: { color: "#fff", fontSize: "16px" },
      },
      fields: {
        number: { selector: "#card-number", placeholder: "4111 1111 1111 1111" },
        expirationDate: { selector: "#card-expiry", placeholder: "MM/AA" },
        cvv: { selector: "#card-cvv", placeholder: "CVC" },
      },
      createOrder: async () => {
        if (isMarketplace) {
          const res = await fetch("/api/marketplace/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listingId: Number(listingIdParam),
              method: "PAYPAL_ONLINE",
              shippingMethodId,
              shipping: {
                name: fullName,
                addr1: (shippingFrom as any).address1,
                addr2: (shippingFrom as any).address2,
                zip: (shippingFrom as any).zip,
                city: (shippingFrom as any).city,
                country: (shippingFrom as any).country,
              },
            }),
          });
          const j = await res.json();
          if (!res.ok || !j?.paypalOrderId) throw new Error(j?.error || "Création commande PayPal échouée");
          return j.paypalOrderId as string;
        }
        // Store classique
        const payload = {
          items,
          shipping: {
            name: fullName,
            addr1: (shippingFrom as any).address1,
            addr2: (shippingFrom as any).address2,
            zip: (shippingFrom as any).zip,
            city: (shippingFrom as any).city,
            country: (shippingFrom as any).country,
          },
          shippingMethodId,
        };
        const res = await fetch("/api/paypal/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data?.id) throw new Error(data.error || "Création commande PayPal échouée");
        return data.id as string;
      },
    })
      .then((hf: any) => {
        hostedFieldsInstance.current = hf;
        setHfLoading(false);
        setHfReady(true);
        const containers: Record<string, HTMLElement | null> = {
          number: document.getElementById("card-number"),
          expirationDate: document.getElementById("card-expiry"),
          cvv: document.getElementById("card-cvv"),
        };
        hf.on("focus", ({ emittedBy }: any) => { containers[emittedBy]?.classList.add("input-focus"); });
        hf.on("blur", ({ emittedBy }: any) => { containers[emittedBy]?.classList.remove("input-focus"); });
        hf.on("validityChange", ({ fields, emittedBy }: any) => {
          const el = containers[emittedBy];
          if (!el) return;
          el.classList.remove("input-error", "input-success");
          const f = fields[emittedBy];
          if (f?.isValid) el.classList.add("input-success");
          else if (f?.isPotentiallyValid === false) el.classList.add("input-error");
        });
      })
      .catch((err: any) => { 
        console.warn("Hosted Fields non disponibles, utilisation du bouton PayPal standard:", err?.message || "Erreur inconnue"); 
        setHfLoading(false); 
        setHfReady(false);
        // Ne pas afficher d'erreur - le bouton PayPal standard permet quand même le paiement par carte
      });
  }, [sdkReady, step, items, fullName, shippingFrom, shippingMethodId, isMarketplace, listingIdParam, isAuthed]);

  // Render PayPal Pay Later button when SDK is ready and step is card
  useEffect(() => {
    const win: any = window as any;
    if (step !== "card" || !sdkReady || !win.paypal?.Buttons || payLaterRendered) return;
    if (isMarketplace && !isAuthed) return;

    try {
      const funding = win.paypal.FUNDING?.PAYLATER;
      const buttons = win.paypal.Buttons({
        fundingSource: funding,
        style: { layout: "horizontal", color: "gold", label: "pay" },
        createOrder: async () => {
          // Validation des données avant de créer la commande
          const validationError = validate();
          if (validationError) {
            setError(validationError);
            throw new Error(validationError);
          }

          if (isMarketplace) {
            const res = await fetch("/api/marketplace/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                listingId: Number(listingIdParam),
                method: "PAYPAL_ONLINE",
                shippingMethodId,
                shipping: {
                  name: fullName,
                  addr1: (shippingFrom as any).address1,
                  addr2: (shippingFrom as any).address2,
                  zip: (shippingFrom as any).zip,
                  city: (shippingFrom as any).city,
                  country: (shippingFrom as any).country,
                  phone: (shippingFrom as any).phone,
                },
              }),
            });
            const j = await res.json();
            if (!res.ok || !j?.paypalOrderId) throw new Error(j?.error || "Création commande PayPal échouée");
            return j.paypalOrderId as string;
          }
          const payload = {
            items,
            shipping: {
              name: fullName,
              addr1: (shippingFrom as any).address1,
              addr2: (shippingFrom as any).address2,
              zip: (shippingFrom as any).zip,
              city: (shippingFrom as any).city,
              country: (shippingFrom as any).country,
              phone: (shippingFrom as any).phone,
            },
            shippingMethodId,
          };
          const res = await fetch("/api/paypal/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data?.id) throw new Error(data.error || "Création commande PayPal échouée");
          return data.id as string;
        },
        onApprove: async (data: any) => {
          const orderId: string | undefined = data?.orderID;
          if (!orderId) throw new Error("orderId manquant");
          if (isMarketplace) {
            const resCap = await fetch("/api/marketplace/orders", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId: Number(listingIdParam), paypalOrderId: orderId, shippingMethodId, isPayLater: true, shipping: {
                name: fullName,
                addr1: (shippingFrom as any).address1,
                addr2: (shippingFrom as any).address2,
                zip: (shippingFrom as any).zip,
                city: (shippingFrom as any).city,
                country: (shippingFrom as any).country,
              } }),
            });
            if (!resCap.ok) {
              const j = await resCap.json().catch(() => ({}));
              setError("Paiement refusé");
              return;
            }
            // Vérification stricte de la réponse pour s'assurer que le paiement est bien validé
            const result = await resCap.json().catch(() => ({}));
            if (!result || !result.success) {
              setError("Paiement refusé");
              return;
            }
            window.location.href = "/success?provider=paypal";
            return;
          }
          const resCap = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              cart: items,
              email: userEmail,
              isPayLater: true,
              shipping: {
                name: fullName,
                addr1: (shippingFrom as any).address1,
                addr2: (shippingFrom as any).address2,
                zip: (shippingFrom as any).zip,
                city: (shippingFrom as any).city,
                country: (shippingFrom as any).country,
                phone: (shippingFrom as any).phone,
              },
              shippingMethodId,
            }),
          });
          if (!resCap.ok) {
            const j = await resCap.json().catch(() => ({}));
            setError("Paiement refusé");
            return;
          }
          const result = await resCap.json().catch(() => ({}));
          if (!result || !result.success) {
            setError("Paiement refusé");
            return;
          }
          window.location.href = "/success?provider=paypal";
        },
        onCancel: async () => {
          // L'utilisateur a annulé le paiement
          console.log("PayPal PayLater cancelled by user");
        },
        onError: (err: any) => { 
          console.error("PayPal PayLater error:", err);
          setError(err?.message || "Erreur PayPal"); 
        },
      });

      // Toujours tenter le render : si le mode n'est pas éligible,
      // le SDK gère l'état lui-même, mais au moins on ne reste pas sans bouton.
      buttons.render("#paypal-paylater-button")
        .then(() => {
          console.log("PayPal PayLater button rendered successfully");
          setPayLaterRendered(true);
        })
        .catch((err: any) => {
          console.error("Failed to render PayPal PayLater button:", err);
        });
    } catch (err) { 
      console.error("PayPal PayLater setup error:", err);
    }
  }, [sdkReady, step, items, fullName, shippingFrom, shippingMethodId, userEmail, payLaterRendered, isMarketplace, listingIdParam, isAuthed]);

  // Render Standard PayPal button (Wallet) when SDK is ready and step is card
  useEffect(() => {
    const win: any = window as any;
    if (step !== "card" || !sdkReady || !win.paypal?.Buttons || paypalRendered) return;
    if (isMarketplace && !isAuthed) return;

    try {
      const funding = win.paypal.FUNDING?.PAYPAL;
      const buttons = win.paypal.Buttons({
        fundingSource: funding,
        style: { layout: "horizontal", color: "gold", label: "paypal" },
        createOrder: async () => {
          // Validation des données avant de créer la commande
          const validationError = validate();
          if (validationError) {
            setError(validationError);
            throw new Error(validationError);
          }

          if (isMarketplace) {
            const res = await fetch("/api/marketplace/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                listingId: Number(listingIdParam),
                method: "PAYPAL_ONLINE",
                shippingMethodId,
                shipping: {
                  name: fullName,
                  addr1: (shippingFrom as any).address1,
                  addr2: (shippingFrom as any).address2,
                  zip: (shippingFrom as any).zip,
                  city: (shippingFrom as any).city,
                  country: (shippingFrom as any).country,
                  phone: (shippingFrom as any).phone,
                },
              }),
            });
            const j = await res.json();
            if (!res.ok || !j?.paypalOrderId) throw new Error(j?.error || "Création commande PayPal échouée");
            return j.paypalOrderId as string;
          }
          const payload = {
            items,
            shipping: {
              name: fullName,
              addr1: (shippingFrom as any).address1,
              addr2: (shippingFrom as any).address2,
              zip: (shippingFrom as any).zip,
              city: (shippingFrom as any).city,
              country: (shippingFrom as any).country,
              phone: (shippingFrom as any).phone,
            },
            shippingMethodId,
          };
          const res = await fetch("/api/paypal/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data?.id) throw new Error(data.error || "Création commande PayPal échouée");
          return data.id as string;
        },
        onApprove: async (data: any) => {
          const orderId: string | undefined = data?.orderID;
          if (!orderId) throw new Error("orderId manquant");
          if (isMarketplace) {
            const resCap = await fetch("/api/marketplace/orders", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId: Number(listingIdParam), paypalOrderId: orderId, shippingMethodId, isPayLater: false, shipping: {
                name: fullName,
                addr1: (shippingFrom as any).address1,
                addr2: (shippingFrom as any).address2,
                zip: (shippingFrom as any).zip,
                city: (shippingFrom as any).city,
                country: (shippingFrom as any).country,
              } }),
            });
            if (!resCap.ok) {
              const j = await resCap.json().catch(() => ({}));
              throw new Error(j.error || "Capture échouée");
            }
            window.location.href = "/success?provider=paypal";
            return;
          }
          const resCap = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              cart: items,
              email: userEmail,
              isPayLater: false,
              shipping: {
                name: fullName,
                addr1: (shippingFrom as any).address1,
                addr2: (shippingFrom as any).address2,
                zip: (shippingFrom as any).zip,
                city: (shippingFrom as any).city,
                country: (shippingFrom as any).country,
                phone: (shippingFrom as any).phone,
              },
              shippingMethodId,
            }),
          });
          if (!resCap.ok) {
            const j = await resCap.json().catch(() => ({}));
            throw new Error(j.error || "Capture échouée");
          }
          window.location.href = "/success?provider=paypal";
        },
        onCancel: async () => {
          // L'utilisateur a annulé le paiement
          console.log("PayPal payment cancelled by user");
        },
        onError: (err: any) => { 
          console.error("PayPal button error:", err);
          setError(err?.message || "Erreur PayPal"); 
        },
      });

      // Toujours tenter le render, même si PayPal indique non-éligible,
      // pour éviter de se retrouver sans bouton cliquable.
      buttons.render("#paypal-standard-button")
        .then(() => {
          console.log("PayPal standard button rendered successfully");
          setPaypalRendered(true);
        })
        .catch((err: any) => {
          console.error("Failed to render PayPal button:", err);
        });
    } catch (err) { 
      console.error("PayPal button setup error:", err);
    }
  }, [sdkReady, step, items, fullName, shippingFrom, shippingMethodId, userEmail, paypalRendered, isMarketplace, listingIdParam, isAuthed]);

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

  const payWithCard = async () => {
    setError(null);
    if (isMarketplace && !isAuthed) { setError("Connectez-vous pour payer cette annonce."); return; }
    setProcessing(true);
    try {
      const hf = hostedFieldsInstance.current;
      if (!hf) throw new Error("Formulaire carte non prêt");

      const submitRes = await hf.submit({ contingencies: ["3D_SECURE"], cardholderName: fullName });
      const orderId: string | undefined = submitRes?.orderId;
      if (!orderId) throw new Error("orderId manquant après la validation carte");

      if (isMarketplace) {
        const resCap = await fetch("/api/marketplace/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: marketplaceOrderIdRef.current, paypalOrderId: orderId }),
        });
        if (!resCap.ok) {
          const j = await resCap.json().catch(() => ({}));
          throw new Error(j.error || "Capture échouée");
        }
        window.location.href = "/success?provider=paypal";
        return;
      }

      // Store: capture + création commande en base
      const resCap = await fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, cart: items, email: userEmail, shipping: {
          name: fullName,
          addr1: (shippingFrom as any).address1,
          addr2: (shippingFrom as any).address2,
          zip: (shippingFrom as any).zip,
          city: (shippingFrom as any).city,
          country: (shippingFrom as any).country,
        }, shippingMethodId }),
      });
      if (!resCap.ok) {
        const j = await resCap.json().catch(() => ({}));
        throw new Error(j.error || "Capture échouée");
      }
      window.location.href = "/success?provider=paypal";
    } catch (e: any) {
      setError(e?.message || "Paiement carte échoué");
      setProcessing(false);
    }
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
          <div className="mt-4"><Link className="btn-primary" href="/catalogue">Voir le catalogue</Link></div>
        </div>
      </main>
    );
  }

  // Compute disabled state for the card form
  const fieldsDisabled = !sdkReady || hfLoading || !hfReady;

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
              <div className="card p-5 space-y-3">
                <h2 className="font-semibold">Paiement</h2>
                <p className="text-sm text-white/70">Transaction sécurisée via PayPal (3D Secure). Vos données ne quittent pas notre site.</p>
                <div className="-mt-1"><AcceptedCards /></div>
                <p className="text-xs text-white/60 mt-1">
                  En cas de problème de paiement, merci de me contacter par email à{" "}
                  <span className="font-medium">wallydibombepro@gmail.com</span>, sur Instagram{" "}
                  <span className="font-medium">@warrenoff</span> ou sur Snapchat{" "}
                  <span className="font-medium">@warrenofff</span>.
                </p>

                {!sdkReady && (
                  <div className="space-y-3 animate-pulse" aria-hidden>
                    <div className="h-11 rounded-md bg-white/10" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-11 rounded-md bg-white/10" />
                      <div className="h-11 rounded-md bg-white/10" />
                    </div>
                    <div className="text-xs text-white/60">
                      {sdkLoading ? "Chargement du module de paiement..." : "Initialisation..."}
                    </div>
                  </div>
                )}

                {/* Message de chargement si les champs carte sont en cours d'initialisation */}
                {sdkReady && !hfReady && hfLoading && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-blue-300">Initialisation du paiement par carte...</h3>
                        <p className="mt-1 text-xs text-blue-200/80">
                          Chargement des champs de paiement sécurisés PayPal.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card via Hosted Fields - seulement si éligible */}
                {hfReady && (
                  <>
                    <div className={`relative grid gap-3`}>
                      <label className="text-sm font-medium text-white/80">{"Numéro de carte"}</label>
                      <div id="card-number" className="input" />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-white/80">{"Expiration"}</label>
                          <div id="card-expiry" className="input" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white/80">{"CVC"}</label>
                          <div id="card-cvv" className="input" />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button type="button" onClick={() => setStep("address")} className="btn-secondary">Retour</button>
                        <button type="button" disabled={processing} onClick={payWithCard} className="btn-primary">
                          {processing ? "Traitement..." : "Payer maintenant"}
                        </button>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="relative py-2 text-center">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative inline-block bg-[var(--bg)] px-3 text-xs text-white/60">ou</div>
                    </div>
                  </>
                )}

                {/* Pay in installments with PayPal - EN PREMIER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Payer en plusieurs fois avec PayPal</div>
                    <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      Recommandé
                    </span>
                  </div>
                  <div id="paypal-paylater-button" className="min-h-[45px]" />
                  <p className="text-xs text-white/60">
                    Payez en 3 ou 4 fois sans frais (selon éligibilité). 
                    Validation instantanée dans l'espace sécurisé PayPal.
                  </p>
                </div>

                {/* Separator */}
                <div className="relative py-2 text-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative inline-block bg-[var(--bg)] px-3 text-xs text-white/60">ou</div>
                </div>

                {/* Pay with PayPal wallet - EN SECOND */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">{"Payer avec PayPal"}</div>
                  <div id="paypal-standard-button" className="min-h-[45px]" />
                  <p className="text-xs text-white/60">{"Paiement comptant avec votre compte PayPal ou votre carte via PayPal."}</p>
                  {!hfReady && sdkReady && (
                    <p className="text-xs text-blue-400 mt-1">
                      💳 Vous pouvez utiliser votre carte bancaire directement via le bouton PayPal ci-dessus, sans créer de compte PayPal.
                    </p>
                  )}
                </div>

                {error && !error.includes("hosted fields") && <p className="text-sm text-red-400 mt-3">{error}</p>}
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
          <p className="text-xs text-gray-500">Paiement sécurisé par PayPal (CB, 3D Secure). Aucun redirection externe.</p>
        </aside>
      </div>
    </main>
  );
}
