"use client";
import { useState, useEffect } from "react";

export default function ParticiperPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      productId: fd.get('productId') ? Number(fd.get('productId')) : undefined,
    };
    setLoading(true);
    try {
      const res = await fetch('/api/contest/participate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => null);
      setLoading(false);
      if (res.ok) {
        setDone(true);
      } else {
        setError(j?.error || 'Erreur');
      }
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || 'Erreur');
    }
  };

  // auto-submit flow: if user is logged in and url contains ?fromRegister=1 or came via register next
  useEffect(() => {
    const tryAuto = async () => {
      try {
        const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const auto = sp.get('fromRegister') === '1' || sp.get('registered') === '1';
        if (!auto) return;
        const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null);
        if (!me?.user) return;
        // submit participation using user info
        const payload = { name: me.user.name || '', email: me.user.email || '' };
        setLoading(true);
        const res = await fetch('/api/contest/participate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setLoading(false);
        if (res.ok) setDone(true);
      } catch {
        setLoading(false);
      }
    };
    tryAuto();
  }, []);

  if (done) return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Merci !</h2>
      <p>Votre participation a été enregistrée.</p>
    </div>
  );

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-semibold">Participer au concours</h2>
      <form onSubmit={handleSubmit} className="grid gap-3 mt-4">
        <label className="text-sm">Nom</label>
        <input name="name" required className="input" />

        <label className="text-sm">Email</label>
        <input name="email" type="email" required className="input" />

        <label className="text-sm">Téléphone (optionnel)</label>
        <input name="phone" className="input" />

        <label className="text-sm">Produit concerné (optionnel ID)</label>
        <input name="productId" className="input" placeholder="ID produit" />

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={loading}>{loading ? 'Envoi…' : 'Participer'}</button>
        </div>
      </form>
    </div>
  );
}
