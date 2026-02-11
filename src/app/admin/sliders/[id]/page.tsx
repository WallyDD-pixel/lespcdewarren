"use client";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Cta = { label: string; href: string };

type Item = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  align?: "left" | "center" | "right" | null;
  position?: string | null;
  cta?: Cta[] | null;
  sortOrder: number;
  isActive: boolean;
};

export default function SliderEditPage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();
  const { data, mutate } = useSWR('/api/admin/sliders', fetcher);
  const [saving, setSaving] = useState(false);
  const item: Item | undefined = useMemo(() => (data?.items ?? []).find((i: Item) => i.id === id), [data, id]);

  useEffect(() => { if (Number.isNaN(id)) router.push('/admin/sliders'); }, [id, router]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      title: fd.get('title'),
      subtitle: fd.get('subtitle'),
      image: fd.get('image'),
      align: fd.get('align'),
      position: fd.get('position'),
      isActive: fd.get('isActive') === 'on',
      sortOrder: Number(fd.get('sortOrder') || 0),
      cta: [] as Cta[],
    };
    const ctaLabels = fd.getAll('ctaLabel');
    const ctaHrefs = fd.getAll('ctaHref');
    for (let i = 0; i < Math.min(ctaLabels.length, ctaHrefs.length); i++) {
      const label = String(ctaLabels[i] || '').trim();
      const href = String(ctaHrefs[i] || '').trim();
      if (label && href) payload.cta.push({ label, href });
    }
    const res = await fetch(`/api/admin/sliders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return alert(j?.error || 'Erreur');
    mutate();
    router.push('/admin/sliders');
  }

  async function del() {
    if (!confirm('Supprimer ce slide ?')) return;
    const res = await fetch(`/api/admin/sliders/${id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => null);
    if (!res.ok) return alert(j?.error || 'Erreur');
    router.push('/admin/sliders');
  }

  if (!item) return <div className="text-sm text-white/70">Chargement…</div>;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Éditer le slide #{item.id}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => router.push('/admin/sliders')}>Retour</button>
          <button className="btn-danger" onClick={del}>Supprimer</button>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm">Titre</label>
          <input name="title" defaultValue={item.title} className="input" required />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Sous-titre</label>
          <input name="subtitle" defaultValue={item.subtitle || ''} className="input" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm">Image (URL ou chemin public)</label>
          <input name="image" defaultValue={item.image} className="input" required />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Alignement</label>
          <select name="align" defaultValue={item.align || 'left'} className="input">
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Position d’image (CSS object-position)</label>
          <input name="position" defaultValue={item.position || ''} className="input" placeholder="right center" />
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={item.isActive} />
            Actif
          </label>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Ordre</label>
          <input name="sortOrder" defaultValue={String(item.sortOrder)} className="input" type="number" />
        </div>

        <div className="md:col-span-2">
          <div className="text-sm font-medium mb-2">Boutons (CTA)</div>
          <div className="grid gap-2">
            {Array.from({ length: Math.max(1, item.cta?.length || 1) }).map((_, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-2">
                <input name="ctaLabel" defaultValue={item.cta?.[i]?.label || ''} className="input" placeholder="Libellé" />
                <input name="ctaHref" defaultValue={item.cta?.[i]?.href || ''} className="input" placeholder="/catalogue" />
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-white/60">Ajoutez une entrée vide pour supprimer une ligne.</div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
