"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminContestManagePage() {
  const KEY = "showJeuxConcours";
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // default: show
        setVisible(true);
        localStorage.setItem(KEY, "1");
      } else {
        setVisible(raw === "1");
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const toggle = () => {
    try {
      const next = !visible;
      setVisible(next);
      localStorage.setItem(KEY, next ? "1" : "0");
      // reload optional: notify user to refresh the public page if needed
    } catch {}
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion du concours</h1>
          <div className="text-sm text-white/60 mt-1">Contrôle centralisé pour l'affichage de la carte concours</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${visible ? 'bg-green-500 text-black' : 'bg-white/10 text-white'}`}>
              {visible ? 'Actif' : 'Inactif'}
            </div>
            <button onClick={() => toggle()} aria-pressed={visible} className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none" style={{ backgroundColor: visible ? '#34d399' : 'rgba(255,255,255,0.06)' }}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${visible ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <Link href="/admin/contest" className="btn-ghost">Créer une commande</Link>
        </div>
      </div>

      <div className="section-contrast p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Visibilité de la carte</h3>
            <p className="text-white/70 text-sm mt-1">Active ou désactive l'affichage de la carte du concours sur la page d'accueil. Les visiteurs devront recharger la page pour voir le changement.</p>
          </div>

          <div>
            <h3 className="font-semibold">Paramètres de la carte</h3>
            <ContestSettingsForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContestSettingsForm() {
  const { data, mutate } = useSWR('/api/admin/settings', fetcher);
  const [saving, setSaving] = useState(false);

  const initial = data?.settings || {};
  const [imagePreview, setImagePreview] = useState<string | null>(() => initial?.CONTEST_IMAGE_URL || null);
  const [bgColor, setBgColor] = useState<string>(() => initial?.CONTEST_BG_COLOR || '#111827');
  // RGB sliders state
  const hexToRgb = (hex: string) => {
    try {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    } catch { return { r: 17, g: 24, b: 39 }; }
  };
  const initialRgb = hexToRgb(initial?.CONTEST_BG_COLOR || '#111827');
  const [r, setR] = useState<number>(initialRgb.r);
  const [g, setG] = useState<number>(initialRgb.g);
  const [b, setB] = useState<number>(initialRgb.b);

  const rgbToHex = (rr: number, gg: number, bb: number) => '#' + [rr, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join('');

  // keep bgColor in sync with sliders
  useEffect(() => {
    const h = rgbToHex(r, g, b);
    setBgColor(h);
  }, [r, g, b]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      CONTEST_TITLE: String(fd.get('CONTEST_TITLE') || '').trim(),
      CONTEST_IMAGE_URL: String(fd.get('CONTEST_IMAGE_URL') || imagePreview || '').trim(),
      CONTEST_BG_COLOR: String(fd.get('CONTEST_BG_COLOR') || bgColor || '').trim(),
    };
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin'
    });
    const j = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok) {
      mutate();
      alert('Paramètres enregistrés');
    } else alert(j?.error || 'Erreur');
  };

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const colorChoices = ['#111827','#0ea5e9','#10b981','#f97316','#ef4444','#8b5cf6','#ec4899','#facc15'];

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="block text-sm text-white/70">Titre de la carte</label>
      <input name="CONTEST_TITLE" defaultValue={initial?.CONTEST_TITLE || ''} className="input" placeholder="Titre visible sur la carte" />

      <label className="block text-sm text-white/70">Image (glisser-déposer ou sélectionner)</label>
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="border-dashed border-2 border-white/10 rounded p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm text-white/70">Déposez une image ici ou utilisez le bouton pour sélectionner un fichier.</div>
          <input type="file" accept="image/*" onChange={handleFileInput} className="mt-2" />
        </div>
        <div>
          {imagePreview ? (
            <div className="relative w-28 h-20 rounded overflow-hidden bg-black/20">
              <img src={imagePreview} alt="aperçu" className="object-cover w-full h-full" />
              <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-white/10 px-2 py-1 text-xs rounded">Supprimer</button>
            </div>
          ) : (
            <div className="w-28 h-20 rounded bg-white/5 flex items-center justify-center text-xs">Aucun aperçu</div>
          )}
        </div>
      </div>
      {/* Hidden input to include image base64 in FormData if present */}
      <input type="hidden" name="CONTEST_IMAGE_URL" value={imagePreview || ''} />

      <label className="block text-sm text-white/70">Couleur de fond</label>
      <div className="flex items-center gap-2">
        {colorChoices.map((c) => (
          <button key={c} type="button" onClick={() => setBgColor(c)} aria-label={c} className={`w-8 h-8 rounded-full ring-2 ${bgColor === c ? 'ring-white' : 'ring-transparent'}`} style={{ backgroundColor: c }} />
        ))}
        <div className="ml-3 text-sm text-white/60">Sélectionnée: <span style={{ backgroundColor: bgColor }} className="inline-block w-6 h-4 align-middle ml-2 rounded" /></div>
      </div>
      <input type="hidden" name="CONTEST_BG_COLOR" value={bgColor} />

      <label className="block text-sm text-white/70">Sélecteur RGB (personnalisé)</label>
      <div className="p-3 rounded border border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 text-sm">R</div>
          <input type="range" min={0} max={255} value={r} onChange={(e) => setR(Number(e.target.value))} />
          <div className="w-10 text-xs text-right">{r}</div>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 text-sm">G</div>
          <input type="range" min={0} max={255} value={g} onChange={(e) => setG(Number(e.target.value))} />
          <div className="w-10 text-xs text-right">{g}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 text-sm">B</div>
          <input type="range" min={0} max={255} value={b} onChange={(e) => setB(Number(e.target.value))} />
          <div className="w-10 text-xs text-right">{b}</div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="w-20 h-10 rounded" style={{ backgroundColor: bgColor }} />
          <div className="text-sm text-white/70">Hex: {bgColor}</div>
        </div>
      </div>

      <label className="block text-sm text-white/70">Texte en bas de la carte</label>
      <input name="CONTEST_FOOTER_TEXT" defaultValue={initial?.CONTEST_FOOTER_TEXT || ''} className="input" placeholder="Texte affiché en bas de la carte" />

      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}
