"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const HIGHLIGHT_OPTIONS: string[] = [
  "Parfait pour le 1080p",
  "Idéal en 1440p",
  "Prêt pour la 4K",
  "Silencieux",
  "RGB adressable",
  "Wi‑Fi 6E intégré",
  "Ray Tracing",
  "DLSS 3",
  "AMD FSR 3",
  "Livré prêt à l'emploi",
  "Garantie 2 ans",
  "Mise à niveau facile",
  "Boîtier compact",
  "Excellent rapport qualité/prix",
];

export default function NewComponentProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceCents: 0,
    stock: 0,
    active: true,
    categoryId: 0,
    images: [] as { url: string; alt?: string }[],
  specs: "{}",
  });
  const [priceEuro, setPriceEuro] = useState<string>("");

  // Auto-slug
  const slugify = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  const [autoSlug, setAutoSlug] = useState(true);
  type SlotKey = "cpu" | "gpu" | "motherboard" | "ram" | "cooler" | "storage" | "case" | "psu";
  const [slot, setSlot] = useState<SlotKey | "">("");

  // Liste courante des sockets (sélection rapide)
  const SOCKETS = [
    "AM4",
    "AM5",
    "LGA1700",
    "LGA1200",
    "LGA1151",
    "LGA2011-3",
    "LGA2066",
    "TR4",
    "sTRX4",
    "SP3",
    "sWRX8",
  ];

  // Presets de vitesses RAM (MHz)
  const RAM_SPEEDS = [
    2133, 2400, 2666, 2933, 3000, 3200, 3466, 3600, 3733, 4000,
    4266, 4400, 4600, 4800, 5200, 5600, 6000, 6400, 6800, 7200, 7600, 8000
  ];
  // Nouvel état: champs spécifiques au slot
  const [slotSpecs, setSlotSpecs] = useState<Record<string, any>>({});

  // Upload local -> /api/uploads
  const [uploading, setUploading] = useState(false);
  async function uploadImages(files: File[]) {
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    setUploading(true);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd, headers: { "x-requested-with": "XMLHttpRequest" } });
      let json: any = null;
      try { json = await res.json(); } catch { json = null; }
      if (!res.ok || !json?.ok) {
        const errMsg = json?.error || `Échec de l’upload (${res.status})`;
        alert(errMsg);
        return;
      }
      if (Array.isArray(json.urls)) {
        setForm((f) => ({ ...f, images: [...f.images, ...json.urls.map((url: string) => ({ url }))] }));
      }
    } catch (e: any) {
      alert(e?.message || "Échec de l’upload");
    } finally {
      setUploading(false);
    }
  }

  const [specsForm, setSpecsForm] = useState<{ highlights: string[] }>({ highlights: [] });
  const safeParse = (json: string): Record<string, unknown> => { try { return JSON.parse(json || "{}") ?? {}; } catch { return {}; } };

  // Synchronise l’aperçu JSON en incluant highlights + slotSpecs + role/slot
  const syncSpecs = (updated: typeof specsForm) => {
    setSpecsForm(updated);
    setForm((f) => ({
      ...f,
      specs: JSON.stringify({ ...safeParse(f.specs), ...updated, ...slotSpecs, role: "component", slot }, null, 2),
    }));
  };

  const syncSlotSpecs = (patch: Record<string, any>) => {
    setSlotSpecs((prev) => {
      const next = { ...prev, ...patch };
      setForm((f) => ({
        ...f,
        specs: JSON.stringify({ ...safeParse(f.specs), ...specsForm, ...next, role: "component", slot }, null, 2),
      }));
      return next;
    });
  };

  const [saving, setSaving] = useState(false);

  // Réordonner une image à l’aide de la molette (deltaY): haut = gauche, bas = droite
  function moveImage(index: number, dir: -1 | 1) {
    setForm((prev) => {
      const arr = [...prev.images];
      const to = Math.max(0, Math.min(arr.length - 1, index + dir));
      if (to === index) return prev;
      const [it] = arr.splice(index, 1);
      arr.splice(to, 0, it);
      return { ...prev, images: arr };
    });
  }

  const create = async () => {
    if (saving) return;
    // Validations de base
    if (!form.name.trim()) { alert("Le nom est obligatoire"); return; }
    if (!form.slug.trim()) { alert("Le slug est obligatoire"); return; }
    if (!slot) { alert("Choisissez le slot du composant"); return; }
    if (!form.categoryId || form.categoryId === 0) { alert("Sélectionnez une catégorie valide"); return; }

    const mergedSpecs: any = { ...safeParse(form.specs), ...specsForm, ...slotSpecs, role: "component", slot };
    const priceCents = Math.round(parseFloat(priceEuro.replace(",",".")) * 100) || 0;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...form, priceCents, specs: mergedSpecs }),
      });
      if (!res.ok) {
        let msg = "Erreur inconnue";
        try {
          const j = await res.json();
          msg = j?.error || JSON.stringify(j);
        } catch {}
        alert(`Échec de la création: ${msg}`);
        return;
      }
      router.push("/admin/products");
    } catch (e) {
      alert("Échec de la création: problème réseau ou serveur");
    } finally {
      setSaving(false);
    }
  };

  // Charger les catégories pour garantir un categoryId valide
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/categories");
        const json = await res.json();
        // Filtrer pour ne garder que la catégorie 'composant'
        const cats = (json?.categories ?? []).filter((c: any) => c.name.toLowerCase().includes("composant")).map((c: any) => ({ id: c.id, name: c.name }));
        setCategories(cats);
        setForm((f) => ({ ...f, categoryId: f.categoryId || (cats[0]?.id ?? 0) }));
      } catch {
        // ignore
      }
    })();
  }, []);

  // Réinitialise les champs spécifiques lorsque le slot change et synchronise l’aperçu JSON
  useEffect(() => {
    setSlotSpecs({});
    setForm((f) => ({
      ...f,
      specs: JSON.stringify({ ...safeParse(f.specs), ...specsForm, role: "component", slot }, null, 2),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  // Helpers UI
  const bool = (v: any) => Boolean(v);
  const arrToggle = (arr: string[] | undefined, value: string, on: boolean) => {
    const base = Array.isArray(arr) ? arr : [];
    const next = on ? Array.from(new Set([...base, value])) : base.filter((x) => x !== value);
    return next;
  };

  const renderSlotFields = () => {
    if (!slot) return null;
    switch (slot) {
      case "cpu": {
        const socketCustom = Boolean(slotSpecs.socketCustom);
        const selected = socketCustom ? "__custom" : (slotSpecs.socket || "");
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Socket CPU</label>
              <select
                className="input"
                value={selected}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom") return syncSlotSpecs({ socketCustom: true, socket: "" });
                  syncSlotSpecs({ socketCustom: false, socket: v });
                }}
              >
                <option value="">—</option>
                {SOCKETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__custom">Autre…</option>
              </select>
              {socketCustom && (
                <input
                  className="input mt-2"
                  placeholder="Saisir un socket (ex: LGA1700)"
                  value={slotSpecs.socket || ""}
                  onChange={(e) => syncSlotSpecs({ socket: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">TDP (W)</label>
              <input type="number" className="input" value={slotSpecs.tdpW ?? ""} onChange={(e) => syncSlotSpecs({ tdpW: Number(e.target.value) || 0 })} />
            </div>
          </div>
        );
      }
      case "motherboard": {
        const socketCustom = Boolean(slotSpecs.socketCustom);
        const selected = socketCustom ? "__custom" : (slotSpecs.socket || "");
        const maxSpeedCustom = Boolean(slotSpecs.maxRamSpeedCustom);
        const selectedSpeed = maxSpeedCustom ? "__custom" : (slotSpecs.maxRamSpeed ?? "");
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Socket</label>
              <select
                className="input"
                value={selected}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom") return syncSlotSpecs({ socketCustom: true, socket: "" });
                  syncSlotSpecs({ socketCustom: false, socket: v });
                }}
              >
                <option value="">—</option>
                {SOCKETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__custom">Autre…</option>
              </select>
              {socketCustom && (
                <input
                  className="input mt-2"
                  placeholder="Saisir un socket (ex: LGA1700)"
                  value={slotSpecs.socket || ""}
                  onChange={(e) => syncSlotSpecs({ socket: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Type RAM</label>
              <select className="input" value={slotSpecs.ramType || ""} onChange={(e) => syncSlotSpecs({ ramType: e.target.value })}>
                <option value="">—</option>
                <option value="ddr4">DDR4</option>
                <option value="ddr5">DDR5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Vitesse RAM max (MHz)</label>
              <div className="flex gap-2">
                <select
                  className="input"
                  value={selectedSpeed}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom") return syncSlotSpecs({ maxRamSpeedCustom: true, maxRamSpeed: "" });
                    syncSlotSpecs({ maxRamSpeedCustom: false, maxRamSpeed: Number(v) || 0 });
                  }}
                >
                  <option value="">—</option>
                  {RAM_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__custom">Autre…</option>
                </select>
                {maxSpeedCustom && (
                  <input
                    type="number"
                    className="input flex-1"
                    placeholder="ex: 6200"
                    value={slotSpecs.maxRamSpeed ?? ""}
                    onChange={(e) => syncSlotSpecs({ maxRamSpeed: Number(e.target.value) || 0 })}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Form factor</label>
              <select className="input" value={slotSpecs.formFactor || ""} onChange={(e) => syncSlotSpecs({ formFactor: e.target.value })}>
                <option value="">—</option>
                <option value="mini-itx">Mini-ITX</option>
                <option value="matx">mATX</option>
                <option value="atx">ATX</option>
                <option value="eatx">E-ATX</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Slots M.2</label>
              <input type="number" className="input" value={slotSpecs.m2Slots ?? ""} onChange={(e) => syncSlotSpecs({ m2Slots: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Ports SATA</label>
              <input type="number" className="input" value={slotSpecs.sataPorts ?? ""} onChange={(e) => syncSlotSpecs({ sataPorts: Number(e.target.value) || 0 })} />
            </div>
          </div>
        );
      }
      case "ram": {
        const speedCustom = Boolean(slotSpecs.speedCustom);
        const selectedSpeed = speedCustom ? "__custom" : (slotSpecs.speed ?? "");
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select className="input" value={slotSpecs.type || ""} onChange={(e) => syncSlotSpecs({ type: e.target.value })}>
                <option value="">—</option>
                <option value="ddr4">DDR4</option>
                <option value="ddr5">DDR5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Vitesse (MHz)</label>
              <div className="flex gap-2">
                <select
                  className="input"
                  value={selectedSpeed}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom") return syncSlotSpecs({ speedCustom: true, speed: "" });
                    syncSlotSpecs({ speedCustom: false, speed: Number(v) || 0 });
                  }}
                >
                  <option value="">—</option>
                  {RAM_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__custom">Autre…</option>
                </select>
                {speedCustom && (
                  <input
                    type="number"
                    className="input flex-1"
                    placeholder="ex: 4133"
                    value={slotSpecs.speed ?? ""}
                    onChange={(e) => syncSlotSpecs({ speed: Number(e.target.value) || 0 })}
                  />
                )}
              </div>
            </div>
          </div>
        );
      }
      case "gpu":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Longueur (mm)</label>
              <input type="number" className="input" value={slotSpecs.lengthMm ?? ""} onChange={(e) => syncSlotSpecs({ lengthMm: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">TDP (W)</label>
              <input type="number" className="input" value={slotSpecs.tdpW ?? ""} onChange={(e) => syncSlotSpecs({ tdpW: Number(e.target.value) || 0 })} />
            </div>
          </div>
        );
      case "case":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Formats carte mère supportés</label>
              <div className="flex flex-wrap gap-3 text-sm">
                { [
                  { v: "mini-itx", label: "Mini-ITX" },
                  { v: "matx", label: "mATX" },
                  { v: "atx", label: "ATX" },
                  { v: "eatx", label: "E-ATX" },
                ].map((o) => {
                  const arr = (slotSpecs.supportedFormFactors as string[] | undefined) || [];
                  const checked = arr.includes(o.v);
                  return (
                    <label key={o.v} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => syncSlotSpecs({ supportedFormFactors: arrToggle(arr, o.v, e.target.checked) })}
                      />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Longueur GPU max (mm)</label>
              <input type="number" className="input" value={slotSpecs.maxGpuLengthMm ?? ""} onChange={(e) => syncSlotSpecs({ maxGpuLengthMm: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Hauteur ventirad max (mm)</label>
              <input type="number" className="input" value={slotSpecs.maxCoolerHeightMm ?? ""} onChange={(e) => syncSlotSpecs({ maxCoolerHeightMm: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Format PSU</label>
              <select className="input" value={slotSpecs.psuFormFactor || ""} onChange={(e) => syncSlotSpecs({ psuFormFactor: e.target.value })}>
                <option value="">—</option>
                <option value="atx">ATX</option>
                <option value="sfx">SFX</option>
                <option value="sfx-l">SFX-L</option>
              </select>
            </div>
          </div>
        );
      case "cooler":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Sockets supportés</label>
              <div className="flex flex-wrap gap-3 text-sm">
                {SOCKETS.map((s) => {
                  const all = (Array.isArray(slotSpecs.supportedSockets) ? (slotSpecs.supportedSockets as string[]) : []);
                  const known = all.filter((x) => SOCKETS.includes(x));
                  const customs = all.filter((x) => !SOCKETS.includes(x));
                  const checked = known.includes(s);
                  return (
                    <label key={s} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextKnown = arrToggle(known, s, e.target.checked);
                          const next = Array.from(new Set([...nextKnown, ...customs]));
                          syncSlotSpecs({ supportedSockets: next });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  );
                })}
              </div>
              <input
                className="input mt-2"
                placeholder="Autres sockets (ex: LGA775, FM2) séparés par des virgules"
                value={(() => {
                  const all = (Array.isArray(slotSpecs.supportedSockets) ? (slotSpecs.supportedSockets as string[]) : []);
                  return all.filter((x) => !SOCKETS.includes(x)).join(", ");
                })()}
                onChange={(e) => {
                  const all = (Array.isArray(slotSpecs.supportedSockets) ? (slotSpecs.supportedSockets as string[]) : []);
                  const known = all.filter((x) => SOCKETS.includes(x));
                  const customs = e.target.value
                    .split(/[,|/]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .filter((x) => !SOCKETS.includes(x));
                  const next = Array.from(new Set([...known, ...customs]));
                  syncSlotSpecs({ supportedSockets: next });
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Hauteur (mm)</label>
              <input type="number" className="input" value={slotSpecs.heightMm ?? ""} onChange={(e) => syncSlotSpecs({ heightMm: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Capacité TDP supportée (W)</label>
              <input type="number" className="input" value={slotSpecs.tdpSupportW ?? ""} onChange={(e) => syncSlotSpecs({ tdpSupportW: Number(e.target.value) || 0 })} />
            </div>
          </div>
        );
      case "storage":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Interface</label>
              <select className="input" value={slotSpecs.interface || ""} onChange={(e) => syncSlotSpecs({ interface: e.target.value })}>
                <option value="">—</option>
                <option value="nvme">NVMe (M.2)</option>
                <option value="sata">SATA</option>
              </select>
            </div>
          </div>
        );
      case "psu":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Puissance (W)</label>
              <input type="number" className="input" value={slotSpecs.wattage ?? ""} onChange={(e) => syncSlotSpecs({ wattage: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Form factor</label>
              <select className="input" value={slotSpecs.formFactor || ""} onChange={(e) => syncSlotSpecs({ formFactor: e.target.value })}>
                <option value="">—</option>
                <option value="atx">ATX</option>
                <option value="sfx">SFX</option>
                <option value="sfx-l">SFX-L</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Nouveau composant</h2>

      <div className="section-contrast p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, name: v, slug: autoSlug ? slugify(v) : f.slug }));
              }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input
              className="input"
              value={form.slug}
              onFocus={() => setAutoSlug(false)}
              onChange={(e) => {
                setAutoSlug(false);
                const v = slugify(e.target.value);
                setForm((f) => ({ ...f, slug: v }));
              }}
              onBlur={(e) => {
                const v = slugify(e.target.value);
                if (v !== form.slug) setForm((f) => ({ ...f, slug: v }));
              }}
            />
            {/* <small className="text-xs text-white/60">Généré automatiquement depuis le nom (modifiez pour personnaliser).</small> */}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <textarea rows={5} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Prix (€)</label>
            <input
              inputMode="decimal"
              placeholder="0,00"
              className="input"
              value={priceEuro}
              onChange={(e) => setPriceEuro(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Catégorie</label>
            <select
              className="input"
              value={form.categoryId || 0}
              onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
            >
              {categories.length === 0 && <option value={0}>— Aucune catégorie —</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>Actif</span>
          </div>
        </div>
      </div>

      <div className="section-contrast p-4">
        <label className="block text-sm mb-1">Slot du composant</label>
        <select value={slot} onChange={(e) => setSlot(e.target.value as SlotKey)} className="input">
          <option value="">— Sélectionner —</option>
          <option value="cpu">Processeur (CPU)</option>
          <option value="gpu">Carte graphique (GPU)</option>
          <option value="motherboard">Carte mère</option>
          <option value="ram">Mémoire (RAM)</option>
          <option value="cooler">Refroidissement</option>
          <option value="storage">Stockage</option>
          <option value="case">Boîtier</option>
          <option value="psu">Alimentation (PSU)</option>
        </select>

        {/* Champs spécifiques selon le slot */}
        {slot && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Champs spécifiques ({slot})</h3>
            {renderSlotFields()}
          </div>
        )}
      </div>

      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-2">Images</h3>
        <div className="mb-2 flex flex-wrap gap-2">
          {form.images.map((im, i) => (
            <div
              key={i}
              className="relative"
              onWheel={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(i, e.deltaY > 0 ? 1 : -1); }}
              title="Astuce: utilisez la molette pour déplacer cette image"
            >
              <img src={im.url} alt={im.alt || ""} className="h-24 w-36 object-cover rounded border border-white/10" />
              <button className="absolute -top-2 -right-2 btn-ghost" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
        </div>
        <label className="btn-ghost inline-flex items-center gap-2">
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files||[]); if (files.length) void uploadImages(files); e.currentTarget.value = ""; }} />
          Ajouter des images
        </label>
        {uploading && <div className="text-sm text-white/70">Téléversement…</div>}
        <div className="text-xs text-white/60 mt-2">Astuce: faites défiler la molette sur une image pour changer son ordre.</div>
      </div>

      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-2">Points forts (facultatif)</h3>
        <div className="grid gap-2">
          {specsForm.highlights.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" value={v} onChange={(e) => syncSpecs({ highlights: specsForm.highlights.map((x, j) => j===i ? e.target.value : x) })} />
              <button className="btn-ghost" onClick={() => syncSpecs({ highlights: specsForm.highlights.filter((_, j) => j!==i) })}>Supprimer</button>
            </div>
          ))}
          <button className="btn-ghost w-fit" onClick={() => syncSpecs({ highlights: [...specsForm.highlights, ""] })}>+ Ajouter un point fort</button>
        </div>
        {/* Suggestions rapides */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/60">Suggestions:</span>
          {HIGHLIGHT_OPTIONS.map((opt) => {
            const selected = specsForm.highlights.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                className={`px-2 py-1 rounded border border-white/15 hover:bg-white/5 ${selected ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (selected) return;
                  const next = Array.from(new Set([...(specsForm.highlights || []), opt]));
                  syncSpecs({ highlights: next });
                }}
                title={selected ? "Déjà ajouté" : "Ajouter"}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-2">Caractéristiques (JSON avancé)</h3>
        <textarea rows={10} className="input font-mono" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} />
      </div>

      <div className="flex gap-2">
        <button className="btn-primary disabled:opacity-60" onClick={create} disabled={saving}>{saving ? "Création…" : "Créer"}</button>
        <button className="btn-ghost" onClick={() => router.push("/admin/products")}>Annuler</button>
      </div>
    </div>
  );
}
