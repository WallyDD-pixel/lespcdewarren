"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { toISO2 } from "@/lib/shipping";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address1: string;
  address2: string;
  zip: string;
  city: string;
  department: string;
  country: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    department: "",
    country: "France",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextParam = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "").get("next"), []);

  // Autocomplétion Google Places pour l'adresse
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

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) e.firstName = "Prénom requis";
    if (!form.lastName.trim()) e.lastName = "Nom requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (form.password.length < 8) e.password = "8 caractères minimum";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Les mots de passe ne correspondent pas";
    if (!form.address1.trim()) e.address1 = "Adresse requise";
    if (!form.zip.trim()) e.zip = "Code postal requis";
    if (!form.city.trim()) e.city = "Ville requise";
    if (!form.country.trim()) e.country = "Pays requis";
    if (form.phone && !/^\+?[0-9 .-]{7,}$/.test(form.phone)) e.phone = "Téléphone invalide";
    if (form.zip && !/^[0-9A-Za-z -]{3,10}$/.test(form.zip)) e.zip = "Code postal invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (key: keyof FormState) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: ev.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          address1: form.address1.trim(),
          address2: form.address2.trim() || undefined,
          zip: form.zip.trim(),
          city: form.city.trim(),
          department: form.department.trim() || undefined,
          country: form.country.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de l'inscription");

      // Auto-login then redirect to next or home
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      if (!login.ok) {
        // fallback: go to login with flag
        const url = "/login?registered=1" + (nextParam ? `&next=${encodeURIComponent(nextParam)}` : "");
        window.location.href = url;
        return;
      }

      const dest = nextParam || "/";
      window.location.href = dest;
    } catch (err: any) {
      setGeneralError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]";
  const label = "block text-sm mb-1";
  const field = (name: keyof FormState, labelText: string, type: string = "text", extra?: { placeholder?: string }) => (
    <div>
      <label className={label}>{labelText}</label>
      <input
        value={form[name] as string}
        onChange={onChange(name)}
        type={type}
        placeholder={extra?.placeholder}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className={`${input} ${errors[name] ? "border-red-500/60 focus:ring-red-500" : ""}`}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-400">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Créer un compte</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-6" noValidate>
        {generalError && <div className="text-red-400 text-sm">{generalError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("firstName", "Prénom")}
          {field("lastName", "Nom")}
          {field("email", "Email", "email")}
          {field("phone", "Téléphone", "tel")}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("password", "Mot de passe", "password")}
          {field("confirmPassword", "Confirmer le mot de passe", "password")}
        </div>
        <div className="grid grid-cols-1 gap-4">
          {/* Adresse avec autocomplétion Google */}
          <div className="relative">
            <label className={label}>Adresse</label>
            <input
              value={form.address1}
              onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
              placeholder="Adresse"
              className={`${input} ${errors.address1 ? "border-red-500/60 focus:ring-red-500" : ""}`}
              aria-invalid={!!errors.address1}
              aria-describedby={errors.address1 ? `address1-error` : undefined}
              autoComplete="street-address"
              onFocus={() => setAddrFocus(true)}
              onBlur={() => setTimeout(() => setAddrFocus(false), 120)}
            />
            {errors.address1 && (
              <p id={`address1-error`} className="mt-1 text-xs text-red-400">{errors.address1}</p>
            )}
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
          {field("address2", "Complément d'adresse")}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field("zip", "Code postal")}
          {field("city", "Ville")}
          <div>
            <label className={label}>Pays</label>
            <select
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              aria-invalid={!!errors.country}
              className={`${input} ${errors.country ? "border-red-500/60 focus:ring-red-500" : ""}`}
            >
              <option>France</option>
              <option>Belgique</option>
              <option>Suisse</option>
              <option>Luxembourg</option>
              <option>Canada</option>
            </select>
            {errors.country && (
              <p className="mt-1 text-xs text-red-400">{errors.country}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("department", "Département (optionnel)")}
        </div>

        <button disabled={loading} className="btn-cart rounded-md px-5 py-3 font-semibold disabled:opacity-50">
          {loading ? "Création du compte..." : "Créer mon compte"}
        </button>
        <p className="text-sm text-white/70">
          Déjà un compte ? {" "}
          <Link href={`/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`} className="text-[var(--accent)] underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
