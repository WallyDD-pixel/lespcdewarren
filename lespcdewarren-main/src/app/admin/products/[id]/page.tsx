
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

export default function EditProductPage() {
  const { id: idStr } = useParams<{ id: string }>();
  const id = Number.parseInt(idStr, 10);
  const router = useRouter();

  // Navigation entre produits
  const { data: productsData } = useSWR("/api/admin/products", (url) => fetch(url).then((r) => r.json()));
  const products = (productsData?.products ?? []) as Array<{ id: number; name: string }>;
  let prevId: number | null = null;
  let nextId: number | null = null;
  if (products.length > 0) {
    const idx = products.findIndex((p) => p.id === id);
    if (idx > 0) prevId = products[idx - 1].id;
    if (idx < products.length - 1 && idx !== -1) nextId = products[idx + 1].id;
  }

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceCents: 0,
    stock: 0,
    active: true,
    categoryId: 1,
    images: [{ url: "", alt: "" }],
  specs: "{}",
  });
  const [specsForm, setSpecsForm] = useState<{
    cpu?: string;
    gpu?: string;
    motherboard?: string;
    ram: string[];
    storage: string[];
    psu?: string;
    os?: string;
    highlights: string[];
  }>({ ram: [], storage: [], highlights: [] });

  const safeParse = (json: string): Record<string, unknown> => {
    try {
      return JSON.parse(json || "{}") ?? {};
    } catch {
      return {};
    }
  };
  const syncSpecs = (updated: typeof specsForm) => {
    setSpecsForm(updated);
    setForm((f) => ({ ...f, specs: JSON.stringify({ ...safeParse(f.specs), ...updated }, null, 2) }));
  };

  useEffect(() => {
    if (Number.isNaN(id)) return;
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          name: d.name,
          slug: d.slug,
          description: d.description,
          priceCents: d.priceCents,
          stock: d.stock,
          active: d.active ?? true,
          categoryId: d.categoryId ?? 1,
          images: d.images?.length ? d.images : [{ url: "", alt: "" }],
          specs: JSON.stringify(d.specs ?? {}, null, 2),
        });
        const s = (d.specs ?? {}) as Record<string, unknown>;
        const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String) : []);
        setSpecsForm({
          cpu: s.cpu != null ? String(s.cpu) : "",
          gpu: s.gpu != null ? String(s.gpu) : "",
          motherboard: s.motherboard != null ? String(s.motherboard) : "",
          ram: arr(s.ram),
          storage: arr(s.storage),
          psu: s.psu != null ? String(s.psu) : "",
          os: s.os != null ? String(s.os) : "",
          highlights: arr(s.highlights),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateArray = (key: "ram" | "storage" | "highlights", index: number, value: string) => {
    const next = { ...specsForm, [key]: specsForm[key].map((v, i) => (i === index ? value : v)) } as typeof specsForm;
    syncSpecs(next);
  };
  const addArrayItem = (key: "ram" | "storage" | "highlights") => {
    const next = { ...specsForm, [key]: [...specsForm[key], ""] } as typeof specsForm;
    syncSpecs(next);
  };
  const removeArrayItem = (key: "ram" | "storage" | "highlights", index: number) => {
    const next = { ...specsForm, [key]: specsForm[key].filter((_, i) => i !== index) } as typeof specsForm;
    syncSpecs(next);
  };

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const save = async () => {
    if (Number.isNaN(id)) return;
    const mergedSpecs = { ...safeParse(form.specs), ...specsForm };
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        specs: mergedSpecs,
      }),
    });
    if (res.ok) {
      setSuccessMsg("Le stock a bien été modifié !");
      setTimeout(() => {
        setSuccessMsg(null);
        router.push("/admin/products");
      }, 1500);
    } else {
      setSuccessMsg("Erreur lors de la modification du stock.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Modifier le produit</h2>
        <div className="flex gap-2">
          {prevId && (
            <Link href={`/admin/products/${prevId}`} className="btn-ghost" title="Produit précédent">←</Link>
          )}
          {nextId && (
            <Link href={`/admin/products/${nextId}`} className="btn-ghost" title="Produit suivant">→</Link>
          )}
        </div>
      </div>
      {successMsg && (
        <div className={`mb-4 text-center font-semibold ${successMsg.includes("Erreur") ? "text-red-500" : "text-green-500"}`}>
          {successMsg}
        </div>
      )}
      <div className="section-contrast p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <textarea rows={5} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Prix (centimes)</label>
            <input type="number" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.priceCents} onChange={e => setForm({ ...form, priceCents: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input type="number" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Catégorie ID</label>
            <input type="number" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Actif</label>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
          </div>
        </div>
      </div>
      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-3">Images</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {form.images.map((img, i) => (
            <div key={i} className="card p-3">
              {img.url && (
                <img src={img.url} alt={img.alt} className="mb-2 w-full h-32 object-cover rounded" />
              )}
              <input placeholder="URL" className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={img.url} onChange={e => setForm({ ...form, images: form.images.map((it, idx) => idx === i ? { ...it, url: e.target.value } : it) })} />
              <input placeholder="Alt" className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={img.alt} onChange={e => setForm({ ...form, images: form.images.map((it, idx) => idx === i ? { ...it, alt: e.target.value } : it) })} />
            </div>
          ))}
        </div>
        <button className="mt-3 btn-ghost" onClick={() => setForm({ ...form, images: [...form.images, { url: "", alt: "" }] })}>+ Ajouter une image</button>
      </div>
      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-3">Caractéristiques (simplifiées)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Processeur (CPU)</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={specsForm.cpu || ""} onChange={(e) => syncSpecs({ ...specsForm, cpu: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Carte graphique (GPU)</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={specsForm.gpu || ""} onChange={(e) => syncSpecs({ ...specsForm, gpu: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Carte mère (Motherboard)</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={specsForm.motherboard || ""} onChange={(e) => syncSpecs({ ...specsForm, motherboard: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Alimentation (PSU)</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={specsForm.psu || ""} onChange={(e) => syncSpecs({ ...specsForm, psu: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Système (OS)</label>
            <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2" value={specsForm.os || ""} onChange={(e) => syncSpecs({ ...specsForm, os: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-2">Mémoire (RAM)</label>
          <div className="grid gap-2">
            {specsForm.ram.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2" value={v} onChange={(e) => updateArray("ram", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => removeArrayItem("ram", i)}>Supprimer</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 btn-ghost" onClick={() => addArrayItem("ram")}>+ Ajouter une ligne RAM</button>
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-2">Stockage</label>
          <div className="grid gap-2">
            {specsForm.storage.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2" value={v} onChange={(e) => updateArray("storage", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => removeArrayItem("storage", i)}>Supprimer</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 btn-ghost" onClick={() => addArrayItem("storage")}>+ Ajouter un stockage</button>
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-2">Points forts</label>
          <div className="grid gap-2">
            {specsForm.highlights.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2" value={v} onChange={(e) => updateArray("highlights", i, e.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => removeArrayItem("highlights", i)}>Supprimer</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 btn-ghost" onClick={() => addArrayItem("highlights")}>+ Ajouter un point fort</button>
        </div>
      </div>
      {/* JSON editor remains for advanced keys */}
      <div className="section-contrast p-4">
        <h3 className="font-semibold mb-3">Caractéristiques (JSON avancé)</h3>
        <textarea rows={10} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={save}>Enregistrer</button>
        <button className="btn-ghost" onClick={() => router.push("/admin/products")}>Annuler</button>
      </div>
    </div>
  );
}
