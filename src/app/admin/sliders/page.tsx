"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Item = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  align?: "left" | "center" | "right" | null;
  position?: string | null;
  cta?: { label: string; href: string }[] | null;
  sortOrder: number;
  isActive: boolean;
};

export default function SlidersAdminPage() {
  const { data, mutate } = useSWR('/api/admin/sliders', fetcher);
  const [saving, setSaving] = useState(false);

  const items: Item[] = useMemo(() => data?.items ?? [], [data]);

  async function addDefault() {
    setSaving(true);
    const res = await fetch('/api/admin/sliders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nouveau slide',
        subtitle: '',
        image: '/hero-1.jpg',
        align: 'left',
        position: 'center',
        cta: [{ label: 'Découvrir', href: '/catalogue' }],
        isActive: true,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || 'Erreur');
    } else {
      mutate();
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sliders d’accueil</h1>
        <button className="btn-primary" onClick={addDefault} disabled={saving}>{saving ? 'Ajout…' : 'Ajouter un slide'}</button>
      </div>

      <div className="grid gap-4">
        {items.map(it => (
          <div key={it.id} className="section-contrast p-4 grid gap-3 md:grid-cols-[220px_1fr_auto] items-center">
            <div className="relative h-24 w-full overflow-hidden rounded border border-white/10 bg-white/5">
              <img src={it.image} alt="visuel" className="h-full w-full object-cover" />
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-white/70">{it.isActive ? 'Actif' : 'Inactif'} • Ordre: {it.sortOrder}</div>
              <div className="text-base font-semibold">{it.title}</div>
              {it.subtitle && <div className="text-sm text-white/75">{it.subtitle}</div>}
              <div className="text-xs text-white/60">Align: {it.align || 'left'} • position: {it.position || 'center'}</div>
            </div>
            <div className="flex gap-2">
              <a className="btn-ghost" href={`/admin/sliders/${it.id}`}>Éditer</a>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-white/70">Aucun slide pour le moment.</div>
        )}
      </div>
    </div>
  );
}
