"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminCategoriesPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/categories", fetcher, { refreshInterval: 60000 });
  const categories = (data?.categories ?? []) as Array<any>;

  const [form, setForm] = useState({ name: "", slug: "", parentId: "" });

  const create = async () => {
    await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, slug: form.slug, parentId: form.parentId ? Number(form.parentId) : null }) });
    setForm({ name: "", slug: "", parentId: "" });
    mutate();
  };
  const update = async (id: number, patch: any) => {
    await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    mutate();
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Catégories</h2>

      <div className="section-contrast p-4 grid gap-3">
        <div className="grid gap-2 md:grid-cols-3">
          <input placeholder="Nom" className="rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Slug" className="rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <select className="rounded-md border border-white/10 bg-black/20 px-3 py-2" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            <option value="">Sans parent</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <button className="btn-primary" onClick={create}>Ajouter</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Produits</th>
              <th className="px-4 py-3">Annonces</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-4">Chargement…</td></tr>}
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-white/10">
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3"><input className="rounded border border-white/10 bg-black/20 px-2 py-1" defaultValue={c.name} onBlur={(e) => update(c.id, { name: e.currentTarget.value })} /></td>
                <td className="px-4 py-3"><input className="rounded border border-white/10 bg-black/20 px-2 py-1" defaultValue={c.slug} onBlur={(e) => update(c.id, { slug: e.currentTarget.value })} /></td>
                <td className="px-4 py-3">
                  <select className="rounded border border-white/10 bg-black/20 px-2 py-1" defaultValue={c.parentId ?? ""} onChange={(e) => update(c.id, { parentId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">—</option>
                    {categories.filter((x) => x.id !== c.id).map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
                  </select>
                </td>
                <td className="px-4 py-3">{c._count?.products ?? 0}</td>
                <td className="px-4 py-3">{c._count?.listings ?? 0}</td>
              </tr>
            ))}
            {categories.length === 0 && !isLoading && <tr><td colSpan={6} className="px-4 py-4">Aucune catégorie</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
