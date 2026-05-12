"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Suggestions statiques pour l'autocomplétion
const CPU_SUGGESTIONS = [
  "Intel Core i5-10400F",
  "Intel Core i5-11400F",
  "Intel Core i5-12400F",
  "Intel Core i5-13400F",
  "Intel Core i7-10700K",
  "Intel Core i7-12700K",
  "Intel Core i7-13700K",
  "Intel Core i9-9900K",
  "Intel Core i9-12900K",
  "Intel Core i9-13900K",
  "AMD Ryzen 5 3600",
  "AMD Ryzen 5 5600",
  "AMD Ryzen 5 5600X",
  "AMD Ryzen 7 3700X",
  "AMD Ryzen 7 5800X",
  "AMD Ryzen 7 5800X3D",
  "AMD Ryzen 9 5900X",
];

const GPU_SUGGESTIONS = [
  "NVIDIA GeForce GTX 1660 Super",
  "NVIDIA GeForce RTX 2060",
  "NVIDIA GeForce RTX 2060 Super",
  "NVIDIA GeForce RTX 3060 12GB",
  "NVIDIA GeForce RTX 3060 Ti",
  "NVIDIA GeForce RTX 3070",
  "NVIDIA GeForce RTX 3080",
  "NVIDIA GeForce RTX 4060",
  "NVIDIA GeForce RTX 4060 Ti",
  "AMD Radeon RX 6600",
  "AMD Radeon RX 6600 XT",
  "AMD Radeon RX 6700 XT",
  "AMD Radeon RX 6800",
  "AMD Radeon RX 6800 XT",
];

const RAM_SUGGESTIONS = [
  "8 Go DDR4 2400MHz",
  "16 Go DDR4 3200MHz",
  "16 Go DDR4 3600MHz",
  "32 Go DDR4 3200MHz",
  "32 Go DDR5 5600MHz",
];

const STORAGE_SUGGESTIONS = [
  "240 Go SSD SATA",
  "500 Go SSD SATA",
  "500 Go SSD NVMe",
  "1 To SSD NVMe",
  "1 To HDD",
  "2 To HDD",
];

const MB_SUGGESTIONS = [
  "MSI B450 Tomahawk Max",
  "MSI B550 Tomahawk",
  "ASUS TUF B550-Plus",
  "ASUS PRIME B660-Plus",
  "Gigabyte B450 Aorus Elite",
  "Gigabyte B550 Aorus Elite",
  "MSI Z490-A Pro",
  "ASUS ROG Strix B550-F",
];

const PSU_SUGGESTIONS = [
  "500W 80+ Bronze",
  "550W 80+ Bronze",
  "650W 80+ Bronze",
  "650W 80+ Gold",
  "750W 80+ Gold",
  "850W 80+ Gold",
];

const CASE_SUGGESTIONS = [
  "NZXT H510",
  "Corsair 4000D",
  "Corsair 275R",
  "Fractal Meshify C",
  "Phanteks P400A",
  "Cooler Master NR200",
];

const OS_SUGGESTIONS = [
  "Windows 10 Home",
  "Windows 10 Pro",
  "Windows 11 Home",
  "Windows 11 Pro",
  "Ubuntu 22.04",
  "Sans OS",
];

export default function NewListingPage() {
  const r = useRouter();
  // Options d'état
  const conditionOptions = [
    { value: "NEW", label: "Neuf" },
    { value: "LIKE_NEW", label: "Comme neuf" },
    { value: "VERY_GOOD", label: "Très bon état" },
    { value: "GOOD", label: "Bon état" },
    { value: "FAIR", label: "État correct" },
    { value: "FOR_PARTS", label: "Pour pièces" },
  ];

  // Etapes (0..3)
  const steps = ["Détails & config", "Photos", "Localisation", "Prix & options"] as const;
  const [step, setStep] = useState(0);

  // Form principal (sans description)
  const [form, setForm] = useState({
    title: "",
    condition: "GOOD",
    city: "",
    zip: "",
    country: "FR",
  });
  const [allowOnline, setAllowOnline] = useState(true);
  const [allowInPerson, setAllowInPerson] = useState(true);
  const [priceEuros, setPriceEuros] = useState("");
  // Dropdown custom pour l'état
  const [condOpen, setCondOpen] = useState(false);
  const condRef = useRef<HTMLDivElement | null>(null);
  const [condActiveIdx, setCondActiveIdx] = useState<number>(() => 0);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!condRef.current) return;
      if (!condRef.current.contains(e.target as Node)) setCondOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const currentCondIdx = conditionOptions.findIndex((o) => o.value === form.condition) ?? 0;

  // Images (upload local -> URLs publiques)
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Specs PC
  const [specs, setSpecs] = useState({
    cpu: "",
    gpu: "",
    ram: "",
    storage: "",
    storage2: "",
    motherboard: "",
    psu: "",
    case: "",
    os: "",
    screen: "",
    notes: "",
  });

  // Suggestions dynamiques de titre selon la config
  const titleSuggestions = useMemo(() => {
    const s: string[] = [];
    const clean = (v: string) => v.replace(/\s+/g, " ").trim();
    if (specs.cpu && specs.gpu) {
      s.push(clean(`PC Gamer ${specs.cpu} / ${specs.gpu}`));
      if (specs.ram) s.push(clean(`${specs.cpu} + ${specs.gpu} - ${specs.ram}`));
    }
    if (specs.cpu && !specs.gpu) s.push(clean(`PC Bureautique ${specs.cpu}`));
    if (!specs.cpu && specs.gpu) s.push(clean(`PC Gamer ${specs.gpu}`));
    // fallback génériques
    s.push("PC Gamer prêt à l'emploi");
    s.push("PC Bureautique silencieux");
    return Array.from(new Set(s)).slice(0, 6);
  }, [specs]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Autocomplétion Google Places pour la ville ---
  const [citySuggestions, setCitySuggestions] = useState<Array<{ label: string; placeId: string }>>([]);
  const [cityFocus, setCityFocus] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityTimer = useRef<any>(null);
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
    if (!cityFocus) return;
    if (!googleReady || !gAutoSvcRef.current) { setCitySuggestions([]); return; }
    const q = (form.city || "").trim();
    if (q.length < 2) { setCitySuggestions([]); return; }
    if (cityTimer.current) clearTimeout(cityTimer.current);
    setCityLoading(true);
    cityTimer.current = setTimeout(() => {
      try {
        const win: any = window as any;
        gAutoSvcRef.current.getPlacePredictions(
          {
            input: q,
            types: ["(cities)"],
            componentRestrictions: { country: (form.country || "FR") },
          },
          (preds: any[], status: any) => {
            if (status !== win.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(preds)) {
              setCitySuggestions([]);
            } else {
              setCitySuggestions(preds.map((p: any) => ({ label: p.description, placeId: p.place_id })));
            }
            setCityLoading(false);
          }
        );
      } catch {
        setCityLoading(false);
      }
    }, 250);
    return () => { if (cityTimer.current) clearTimeout(cityTimer.current); };
  }, [form.city, cityFocus, googleReady]);

  // --- Helpers ---
  const totalSteps = steps.length;
  const canNext = () => {
    setError(null);
    if (step === 0) {
      if (!form.title || form.title.trim().length < 5) { setError("Titre trop court"); return false; }
      return true;
    }
    if (step === 1) return true;
    if (step === 2) {
      if (!form.city || form.city.trim().length < 2) { setError("Ville requise"); return false; }
      return true;
    }
    if (step === 3) {
      const v = (priceEuros || "").replace(",", ".");
      const n = Number(v);
      if (!v || isNaN(n) || n <= 0) { setError("Prix invalide"); return false; }
      if (!allowOnline && !allowInPerson) { setError("Choisir au moins une option"); return false; }
      return true;
    }
    return true;
  };

  const goNext = () => { if (!canNext()) return; if (step < totalSteps - 1) setStep((s) => s + 1); else void submit(); };
  const goPrev = () => setStep((s) => Math.max(0, s - 1));

  // Publication
  async function submit() {
    setLoading(true);
    setError(null);
    const priceCents = Math.round(Number((priceEuros || "").replace(",", ".")) * 100);
    try {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          // description retirée: l’API générera une description à partir des specs
          condition: form.condition,
          city: form.city,
          zip: form.zip,
          country: form.country,
          priceCents,
          allowOnline,
          allowInPerson,
          images,
          specs,
        }),
      });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) { setError(json?.error || "Erreur"); return; }
      if (json?.listing?.id) r.push(`/marketplace/${json.listing.id}`);
    } catch {
      setLoading(false);
      setError("Impossible de publier l’annonce");
    }
  }

  // Upload fichiers -> /api/uploads
  async function uploadImages(files: File[]) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Échec du téléversement");
        return;
      }
      const urls: string[] = Array.isArray(json?.urls) ? json.urls : [];
      if (urls.length) {
        setImages((arr) => Array.from(new Set([...arr, ...urls])));
      }
    } catch {
      setError("Échec du téléversement");
    } finally {
      setUploading(false);
    }
  }

  // DnD fichiers (dropzone)
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const fl = e.dataTransfer?.files;
    if (fl && fl.length) {
      const files = Array.from(fl).filter((f) => f.type.startsWith("image/"));
      void uploadImages(files);
    }
  };

  // Réordonnancement par glisser-déposer des vignettes
  const onTileDragStart = (idx: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIdx(idx);
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); } catch {}
  };
  const onTileDragEnter = (idx: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImages((arr) => {
      const copy = [...arr];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    setDragIdx(idx);
  };
  const onTileDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); };
  const onTileDragEnd = () => { setDragIdx(null); };
  const onTileDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragIdx(null); };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((arr) => {
      const i = idx + dir;
      if (i < 0 || i >= arr.length) return arr;
      const copy = [...arr];
      const tmp = copy[idx];
      copy[idx] = copy[i];
      copy[i] = tmp;
      return copy;
    });
  };

  const COUNTRIES = [
    { code: "FR", label: "France" },
    { code: "BE", label: "Belgique" },
    { code: "CH", label: "Suisse" },
    { code: "LU", label: "Luxembourg" },
    { code: "DE", label: "Allemagne" },
    { code: "ES", label: "Espagne" },
    { code: "IT", label: "Italie" },
    { code: "PT", label: "Portugal" },
  ];

  return (
    <section className="container">
      <h1 className="text-2xl font-bold mb-6">Nouvelle annonce</h1>

      {/* Stepper aligné avec l’accent */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${i === step ? "bg-[var(--accent)] text-white scale-110 shadow-lg" : i < step ? "bg-emerald-500 text-white" : "bg-white/10 text-white/70"}`}>
                  {i + 1}
                </div>
                <span className={`hidden sm:block text-sm transition-colors ${i === step ? "text-[var(--accent)]" : i < step ? "text-emerald-400" : "text-white/60"}`}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 transition-colors ${i < step ? "bg-emerald-400/60" : "bg-white/10"}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}

      {/* Wizard en surface section-contrast */}
      <div className="overflow-hidden relative rounded-2xl section-contrast">
        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="px-5 py-6"
            >
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="block text-sm text-white/80">Titre</label>
                    <input
                      className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      placeholder="Ex: PC Gamer Ryzen 5 / RTX 3060"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      list="title-suggestions"
                    />
                    <datalist id="title-suggestions">
                      {titleSuggestions.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <div>
                      <label className="block text-sm mb-1 text-white/80">État</label>
                      <div
                        ref={condRef}
                        className="relative"
                        role="combobox"
                        aria-expanded={condOpen}
                        aria-haspopup="listbox"
                        aria-controls="cond-listbox"
                      >
                        <button
                          type="button"
                          className="w-full pr-10 border border-white/10 rounded-lg p-3 bg-white/5 text-white text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => { setCondOpen((o) => !o); setCondActiveIdx(currentCondIdx >= 0 ? currentCondIdx : 0); }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") { e.preventDefault(); setCondOpen(true); setCondActiveIdx((i)=> Math.min(conditionOptions.length-1, (i ?? currentCondIdx) + 1)); }
                            if (e.key === "ArrowUp") { e.preventDefault(); setCondOpen(true); setCondActiveIdx((i)=> Math.max(0, (i ?? currentCondIdx) - 1)); }
                            if (e.key === "Enter" && condOpen) { e.preventDefault(); const opt = conditionOptions[condActiveIdx]; if (opt) { setForm({ ...form, condition: opt.value }); setCondOpen(false); } }
                            if (e.key === "Escape") { setCondOpen(false); }
                          }}
                          aria-label="État du produit"
                          aria-activedescendant={condOpen ? `cond-opt-${condActiveIdx}` : undefined}
                        >
                          {conditionOptions.find((o) => o.value === form.condition)?.label || "Choisir"}
                          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.168l3.71-2.937a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0l-4.24-3.36a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {condOpen && (
                            <motion.ul
                              id="cond-listbox"
                              role="listbox"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border border-white/10 bg-black text-white shadow-xl"
                            >
                              {conditionOptions.map((o, idx) => (
                                <li
                                  id={`cond-opt-${idx}`}
                                  key={o.value}
                                  role="option"
                                  aria-selected={form.condition === o.value}
                                  className={`px-3 py-2 text-sm cursor-pointer ${idx === condActiveIdx ? "bg-white/10" : "hover:bg-white/5"}`}
                                  onMouseEnter={() => setCondActiveIdx(idx)}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => { setForm({ ...form, condition: o.value }); setCondOpen(false); }}
                                >
                                  {o.label}
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Configuration PC avec labels + icônes */}
                  <div className="rounded-lg border border-white/10 p-4 space-y-4 bg-white/5">
                    <div className="font-semibold">Configuration du PC</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🧠 Processeur (CPU)</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: AMD Ryzen 5 5600X"
                          value={specs.cpu}
                          onChange={(e)=> setSpecs({ ...specs, cpu: e.target.value })}
                          list="cpu-options"
                        />
                        <datalist id="cpu-options">
                          {CPU_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🎮 Carte graphique (GPU)</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: NVIDIA GeForce RTX 3060 12Go"
                          value={specs.gpu}
                          onChange={(e)=> setSpecs({ ...specs, gpu: e.target.value })}
                          list="gpu-options"
                        />
                        <datalist id="gpu-options">
                          {GPU_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🧵 Mémoire (RAM)</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: 16 Go DDR4 3200MHz"
                          value={specs.ram}
                          onChange={(e)=> setSpecs({ ...specs, ram: e.target.value })}
                          list="ram-options"
                        />
                        <datalist id="ram-options">
                          {RAM_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">💾 Stockage (SSD/HDD)</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: 512 Go SSD NVMe + 1 To HDD"
                          value={specs.storage}
                          onChange={(e)=> setSpecs({ ...specs, storage: e.target.value })}
                          list="storage-options"
                        />
                        <datalist id="storage-options">
                          {STORAGE_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🧩 Carte mère</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: MSI B550 Tomahawk"
                          value={specs.motherboard}
                          onChange={(e)=> setSpecs({ ...specs, motherboard: e.target.value })}
                          list="mb-options"
                        />
                        <datalist id="mb-options">
                          {MB_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🔌 Alimentation (PSU)</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: 650W 80+ Bronze"
                          value={specs.psu}
                          onChange={(e)=> setSpecs({ ...specs, psu: e.target.value })}
                          list="psu-options"
                        />
                        <datalist id="psu-options">
                          {PSU_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🖥️ Boîtier</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: NZXT H510"
                          value={specs.case}
                          onChange={(e)=> setSpecs({ ...specs, case: e.target.value })}
                          list="case-options"
                        />
                        <datalist id="case-options">
                          {CASE_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-white/70">🪟 Système d’exploitation</label>
                        <input
                          className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          placeholder="Ex: Windows 11 Pro"
                          value={specs.os}
                          onChange={(e)=> setSpecs({ ...specs, os: e.target.value })}
                          list="os-options"
                        />
                        <datalist id="os-options">
                          {OS_SUGGESTIONS.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs mb-1 text-white/70">🖥️ Écran (si applicable)</label>
                        <input className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="Ex: 24'' 1080p 144Hz" value={specs.screen} onChange={(e)=> setSpecs({ ...specs, screen: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs mb-1 text-white/70">📝 Notes (garantie, facture, état…)</label>
                        <textarea className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={3} placeholder="Infos complémentaires (OC, températures, poussière, bundle, etc.)" value={specs.notes} onChange={(e)=> setSpecs({ ...specs, notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm text-white/80">Photos</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging ? "bg-[var(--accent)]/10 border-[var(--accent)]/60" : "bg-white/5 border-white/15"}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    Glissez-déposez vos images ici ou sélectionnez-les ci-dessous.
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white cursor-pointer hover:bg-white/10">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) void uploadImages(files);
                          // reset input to allow re-selecting same files
                          e.currentTarget.value = "";
                        }}
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/80"><path d="M12 16V8m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 16.5A3.5 3.5 0 0 0 16.5 13H16a6 6 0 1 0-11.31 2.533" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span>Choisir des images</span>
                    </label>
                    {uploading && <span className="text-sm text-white/70 animate-pulse">Téléversement…</span>}
                    <span className="text-xs text-white/50">JPG, PNG, WebP, GIF — max 10 Mo par fichier</span>
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {images.map((url, idx) => (
                        <motion.div
                          key={url}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                        >
                          <div
                            className={`border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition ${dragIdx === idx ? "ring-2 ring-[var(--accent)]" : ""}`}
                            draggable
                            onDragStart={(e)=> onTileDragStart(idx, e as unknown as React.DragEvent<HTMLDivElement>)}
                            onDragEnter={(e)=> onTileDragEnter(idx, e as unknown as React.DragEvent<HTMLDivElement>)}
                            onDragOver={(e)=> onTileDragOver(e as unknown as React.DragEvent<HTMLDivElement>)}
                            onDragEnd={onTileDragEnd}
                            onDrop={(e)=> onTileDrop(e as unknown as React.DragEvent<HTMLDivElement>)}
                          >
                            <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="image" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex items-center justify-between p-2 gap-2">
                              <div className="truncate text-xs text-gray-600" title={url}>{url}</div>
                              <div className="flex items-center gap-1">
                                <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 transition" onClick={()=> moveImage(idx, -1)}>↑</button>
                                <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 transition" onClick={()=> moveImage(idx, +1)}>↓</button>
                                <button type="button" className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition" onClick={()=> setImages((arr)=> arr.filter((_,i)=> i!==idx))}>Suppr</button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-white/80">Pays</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none border border-white/15 rounded-lg p-3 pr-10 bg-black text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] hover:border-white/25"
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.168l3.71-2.937a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0l-4.24-3.36a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  
                  <div className="relative">
                    

                    <input
                      
                      className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      placeholder="Ville"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      onFocus={() => setCityFocus(true)}
                      onBlur={() => setTimeout(() => setCityFocus(false), 120)}
                      autoComplete="address-level2"
                    />
                    <AnimatePresence>
                      {cityFocus && ((cityLoading) || citySuggestions.length > 0) && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-white/10 bg-black text-white shadow-xl">
                          {cityLoading && <div className="px-3 py-2 text-xs text-white/70">Recherche…</div>}
                          {citySuggestions.map((s, idx) => (
                            <button
                              type="button"
                              key={idx}
                              className="block w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                              onMouseDown={(e)=> e.preventDefault()}
                              onClick={() => {
                                const win: any = window as any;
                                const svc = gPlaceSvcRef.current;
                                if (!svc) return;
                                setCityLoading(true);
                                svc.getDetails({ placeId: s.placeId, fields: ["address_components"] }, (place: any, status: any) => {
                                  setCityLoading(false);
                                  if (status !== win.google.maps.places.PlacesServiceStatus.OK || !place) {
                                    setCitySuggestions([]);
                                    setCityFocus(false);
                                    return;
                                  }
                                  const comps = place.address_components || [];
                                  const get = (type: string) => {
                                    const c = comps.find((a: any) => a.types.includes(type));
                                    return c ? { long: c.long_name, short: c.short_name } : null;
                                  };
                                  const city = get("locality")?.long || get("postal_town")?.long || get("administrative_area_level_2")?.long || "";
                                  const zip = get("postal_code")?.long || "";
                                  const country = get("country")?.short || form.country;
                                  setForm((f) => ({ ...f, city: city || f.city, zip: zip || f.zip, country: country || f.country }));
                                  setCitySuggestions([]);
                                  setCityFocus(false);
                                });
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                          <div className="px-3 py-1 text-[10px] text-white/50">Suggestions par Google Places</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <input className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="Code postal" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1 text-white/80">Prix (en euros)</label>
                      <input className="w-full border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="Ex: 499,99" value={priceEuros} onChange={(e) => setPriceEuros(e.target.value)} />
                    </div>
                  </div>

                  {/* Options de vente stylées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allowOnline}
                      tabIndex={0}
                      onClick={() => setAllowOnline((v) => !v)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAllowOnline((v)=>!v); } }}
                      className={`group relative flex items-start gap-3 rounded-xl border p-4 transition-all text-left
                        ${allowOnline ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${allowOnline ? "bg-[var(--accent)] text-white" : "bg-white/10 text-white/80"}`}>
                        {/* camion d’envoi */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v7H3V7Zm11 3h3l3 3v1h-6V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="7" cy="17.5" r="1.75" fill="currentColor"/><circle cx="16" cy="17.5" r="1.75" fill="currentColor"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">Envoi / achat en ligne</div>
                        <div className="text-xs text-white/70">Paiement en ligne, envoi possible</div>
                      </div>
                      {/* mini toggle visuel */}
                      <div className={`ml-auto h-6 w-11 rounded-full transition-colors ${allowOnline ? "bg-[var(--accent)]/90" : "bg-white/15"}`}>
                        <div className={`h-6 w-6 rounded-full bg-white shadow -mt-[2px] transition-transform ${allowOnline ? "translate-x-5" : "translate-x-0"}`}></div>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allowInPerson}
                      tabIndex={0}
                      onClick={() => setAllowInPerson((v) => !v)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAllowInPerson((v)=>!v); } }}
                      className={`group relative flex items-start gap-3 rounded-xl border p-4 transition-all text-left
                        ${allowInPerson ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${allowInPerson ? "bg-[var(--accent)] text-white" : "bg-white/10 text-white/80"}`}>
                        {/* poignée de main */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8.5 12.5 11 15a2 2 0 0 0 2.83 0L17 11.83M9 7l3 3m-7 1-2 2m18-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">Remise en main propre</div>
                        <div className="text-xs text-white/70">Échange sur place, paiement à la remise</div>
                      </div>
                      <div className={`ml-auto h-6 w-11 rounded-full transition-colors ${allowInPerson ? "bg-[var(--accent)]/90" : "bg-white/15"}`}>
                        <div className={`h-6 w-6 rounded-full bg-white shadow -mt-[2px] transition-transform ${allowInPerson ? "translate-x-5" : "translate-x-0"}`}></div>
                      </div>
                    </button>
                  </div>

                  {/* Aide: impose au moins une option (géré par validation au Next) */}
                  {!allowOnline && !allowInPerson && (
                    <div className="text-xs text-amber-300/90">Choisissez au moins une option de vente.</div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={goPrev} disabled={step === 0 || loading} className="btn-ghost disabled:opacity-50">
          Précédent
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goNext} disabled={loading} className="btn-primary disabled:opacity-50">
            {step < steps.length - 1 ? "Suivant" : (loading ? "Publication…" : "Publier")}
          </button>
        </div>
      </div>
    </section>
  );
}
