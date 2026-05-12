"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Suggestions connues pour l'autocomplétion
const CPU_OPTIONS: string[] = [
  "Intel Core i5-12400F",
  "Intel Core i5-12600K",
  "Intel Core i5-13400F",
  "Intel Core i5-13600K",
  "Intel Core i7-13700K",
  "Intel Core i7-14700K",
  "Intel Core i9-12900K",
  "Intel Core i9-13900K",
  "Intel Core i9-14900K",
  "AMD Ryzen 5 5600",
  "AMD Ryzen 7 5800X3D",
  "AMD Ryzen 5 7600",
  "AMD Ryzen 7 7700",
  "AMD Ryzen 7 7800X3D",
  "AMD Ryzen 9 7950X3D",
];

const GPU_OPTIONS: string[] = [
  "NVIDIA GeForce RTX 4060",
  "NVIDIA GeForce RTX 4060 Ti",
  "NVIDIA GeForce RTX 4070",
  "NVIDIA GeForce RTX 4070 Ti Super",
  "NVIDIA GeForce RTX 4080 Super",
  "NVIDIA GeForce RTX 4090",
  "AMD Radeon RX 6600",
  "AMD Radeon RX 7600",
  "AMD Radeon RX 6700 XT",
  "AMD Radeon RX 6750 XT",
  "AMD Radeon RX 6800",
  "AMD Radeon RX 7800 XT",
  "AMD Radeon RX 7900 XT",
  "Intel Arc A770",
];

const MOTHERBOARD_OPTIONS: string[] = [
  "ASUS TUF Gaming B650-Plus",
  "ASUS ROG STRIX B650E-F",
  "MSI PRO Z690-A DDR4",
  "MSI MAG B760 TOMAHAWK",
  "Gigabyte B760M DS3H",
  "Gigabyte Z790 AORUS Elite",
  "ASRock B550 Phantom Gaming 4",
  "ASRock X670E Steel Legend",
];

const PSU_OPTIONS: string[] = [
  "Corsair RM750",
  "Corsair RM850x",
  "Corsair RM1000x",
  "be quiet! Pure Power 12 M 750W",
  "be quiet! Straight Power 12 850W",
  "Seasonic Focus GX-750",
  "Seasonic Focus GX-850",
  "MSI MPG A850G",
  "Corsair SF750 (SFX)",
  "Corsair SF850L (SFX-L)",
];

const OS_OPTIONS: string[] = [
  "Windows 11 Home",
  "Windows 11 Pro",
  "Windows 10 Pro",
  "Ubuntu 22.04 LTS",
  "Ubuntu 24.04 LTS",
  "Debian 12",
  "Sans OS",
];

const RAM_OPTIONS: string[] = [
  "16 Go (2x8) DDR4-3200",
  "16 Go (2x8) DDR4-3600",
  "32 Go (2x16) DDR4-3600",
  "16 Go (2x8) DDR5-5600",
  "32 Go (2x16) DDR5-6000 CL36",
  "32 Go (2x16) DDR5-6400",
  "64 Go (2x32) DDR5-6000",
];

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

export default function NewPCProductPage() {
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

  // Auto-slug (comme pour les composants)
  const slugify = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  const [autoSlug, setAutoSlug] = useState(true);

  // Upload local -> /api/uploads
  const [uploading, setUploading] = useState(false);
  // Charger les catégories
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/categories");
        const json = await res.json();
        const cats = (json?.categories ?? []).map((c: any) => ({ id: c.id, name: c.name }));
        setCategories(cats);
        setForm((f) => ({ ...f, categoryId: f.categoryId || (cats[0]?.id ?? 0) }));
      } catch {}
    })();
  }, []);

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

  const [specsForm, setSpecsForm] = useState<{ cpu?: string; gpu?: string; motherboard?: string; ram: string[]; storage: string[]; psu?: string; os?: string; highlights: string[] }>({ ram: [], storage: [], highlights: [] });
  const safeParse = (json: string): Record<string, unknown> => { try { return JSON.parse(json || "{}") ?? {}; } catch { return {}; } };
  const syncSpecs = (updated: typeof specsForm) => { setSpecsForm(updated); setForm((f) => ({ ...f, specs: JSON.stringify({ ...safeParse(f.specs), ...updated }, null, 2) })); };
  const updateArray = (key: "ram" | "storage" | "highlights", index: number, value: string) => syncSpecs({ ...specsForm, [key]: specsForm[key].map((v, i) => (i === index ? value : v)) } as typeof specsForm);

  const create = async () => {
    const mergedSpecs: any = { ...safeParse(form.specs), ...specsForm, role: "pc" };
    const priceCents = Math.round(parseFloat(priceEuro.replace(",",".")) * 100) || 0;
    await fetch(`/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "completePC",
        name: form.name,
        slug: form.slug,
        description: form.description,
        priceCents,
        currency: "EUR",
        imageUrl: form.images[0]?.url,
  specs: mergedSpecs,
        stock: form.stock,
        active: form.active,
      }),
    });
    router.push("/admin/products");
  };

  // Réordonner une image avec la molette
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

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Nouveau PC Gamer</h2>
      </div>

      <div className="section-contrast p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: autoSlug ? slugify(name) : f.slug }));
              }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input
              className="input"
              value={form.slug}
              onFocus={() => setAutoSlug(false)}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            />
            <div className="text-xs text-white/50 mt-1">Le slug est auto-généré depuis le nom. Modifiez-le pour le personnaliser.</div>
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
            <select className="input" value={form.categoryId || 0} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
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
        <h3 className="font-semibold mb-3">Caractéristiques (simplifiées)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Processeur (CPU)</label>
            <input className="input" list="cpuOptions" value={specsForm.cpu || ""} onChange={(e) => syncSpecs({ ...specsForm, cpu: e.target.value })} />
            <datalist id="cpuOptions">
              {CPU_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Carte graphique (GPU)</label>
            <input className="input" list="gpuOptions" value={specsForm.gpu || ""} onChange={(e) => syncSpecs({ ...specsForm, gpu: e.target.value })} />
            <datalist id="gpuOptions">
              {GPU_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Carte mère (Motherboard)</label>
            <input className="input" list="mbOptions" value={specsForm.motherboard || ""} onChange={(e) => syncSpecs({ ...specsForm, motherboard: e.target.value })} />
            <datalist id="mbOptions">
              {MOTHERBOARD_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Alimentation (PSU)</label>
            <input className="input" list="psuOptions" value={specsForm.psu || ""} onChange={(e) => syncSpecs({ ...specsForm, psu: e.target.value })} />
            <datalist id="psuOptions">
              {PSU_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Système (OS)</label>
            <input className="input" list="osOptions" value={specsForm.os || ""} onChange={(e) => syncSpecs({ ...specsForm, os: e.target.value })} />
            <datalist id="osOptions">
              {OS_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm mb-2">Mémoire (RAM)</label>
          <div className="grid gap-2">
            {specsForm.ram.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" list="ramOptions" value={v} onChange={(e) => updateArray("ram", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => syncSpecs({ ...specsForm, ram: specsForm.ram.filter((_, j) => j !== i) })}>Supprimer</button>
              </div>
            ))}
          </div>
          <datalist id="ramOptions">
            {RAM_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
          <button type="button" className="mt-2 btn-ghost" onClick={() => syncSpecs({ ...specsForm, ram: [...specsForm.ram, ""] })}>+ Ajouter une ligne RAM</button>
        </div>

        <div className="mt-4">
          <label className="block text-sm mb-2">Stockage</label>
          <div className="grid gap-2">
            {specsForm.storage.map((v, i) => (
              <div key={i} className="flex gap-2">
                {/* Pas d'autocomplétion pour stockage, selon la demande */}
                <input className="input flex-1" value={v} onChange={(e) => updateArray("storage", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => syncSpecs({ ...specsForm, storage: specsForm.storage.filter((_, j) => j !== i) })}>Supprimer</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 btn-ghost" onClick={() => syncSpecs({ ...specsForm, storage: [...specsForm.storage, ""] })}>+ Ajouter un stockage</button>
        </div>

        <div className="mt-4">
          <label className="block text-sm mb-2">Points forts</label>
          <div className="grid gap-2">
            {specsForm.highlights.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" value={v} onChange={(e) => updateArray("highlights", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => syncSpecs({ ...specsForm, highlights: specsForm.highlights.filter((_, j) => j !== i) })}>Supprimer</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 btn-ghost" onClick={() => syncSpecs({ ...specsForm, highlights: [...specsForm.highlights, ""] })}>+ Ajouter un point fort</button>

          {/* Options rapides pour les points forts */}
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
                    syncSpecs({ ...specsForm, highlights: next });
                  }}
                  title={selected ? "Déjà ajouté" : "Ajouter"}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-3">Caractéristiques (JSON avancé)</h3>
        <textarea rows={10} className="input font-mono" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} />
      </div>

      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-3">Images</h3>
        <div className="mb-2 flex flex-wrap gap-2">
          {form.images.map((im, i) => (
            <div key={i} className="relative" onWheel={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(i, e.deltaY > 0 ? 1 : -1); }} title="Molette: changer l'ordre">
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
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={create}>Créer</button>
        <button className="btn-ghost" onClick={() => router.push("/admin/products")}>Annuler</button>
      </div>
    </div>
  );
}
