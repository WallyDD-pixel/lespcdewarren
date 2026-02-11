"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminTestimonialsPage() {
  const { data, mutate } = useSWR("/api/admin/testimonials", fetcher, { refreshInterval: 30000 });
  const testimonials = (data?.testimonials ?? []) as Array<any>;

  const [form, setForm] = useState({ name: "", country: "FR", rating: 5, title: "", content: "" });

  const create = async () => {
    await fetch("/api/admin/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, published: true }) });
    setForm({ name: "", country: "FR", rating: 5, title: "", content: "" });
    mutate();
  };

  const toggle = async (id: number, published: boolean) => {
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published }) });
    mutate();
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Témoignages</h2>

      <div className="section-contrast p-4 grid gap-3">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded-md border border-white/10 bg-black/20 px-3 py-2" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-md border border-white/10 bg-black/20 px-3 py-2" placeholder="Pays (FR)" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <input type="number" min={1} max={5} className="rounded-md border border-white/10 bg-black/20 px-3 py-2" placeholder="Note (1-5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
          <input className="rounded-md border border-white/10 bg-black/20 px-3 py-2" placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea rows={4} className="md:col-span-2 rounded-md border border-white/10 bg-black/20 px-3 py-2" placeholder="Contenu" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <div><button className="btn-primary" onClick={create}>Ajouter</button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t.name}</div>
              <span className={`chip ${t.published ? "" : "opacity-60"}`}>{t.published ? "Publié" : "Brouillon"}</span>
            </div>
            <div className="text-sm text-white/60">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
            <div className="mt-2 text-sm">{t.title}</div>
            <p className="mt-2 text-sm text-white/80 whitespace-pre-line">{t.content}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost" onClick={() => toggle(t.id, !t.published)}>{t.published ? "Dépublier" : "Publier"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
