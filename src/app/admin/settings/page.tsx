"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminSettingsPage() {
  const settings = useSWR('/api/admin/settings', fetcher);
  const [saving, setSaving] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      DISCORD_URL: fd.get('DISCORD_URL'),
      STRIPE_SECRET_KEY: fd.get('STRIPE_SECRET_KEY'),
      STRIPE_PUBLISHABLE_KEY: fd.get('STRIPE_PUBLISHABLE_KEY'),
      STRIPE_WEBHOOK_SECRET: fd.get('STRIPE_WEBHOOK_SECRET'),
    } as any;
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok) settings.mutate();
    else alert(j?.error || 'Erreur enregistrement');
  }

  const maintenanceOn = (settings.data?.settings?.MAINTENANCE_MODE || 'off') === 'on';
  const toggleMaintenance = async () => {
    try {
      setSavingMaint(true);
      const next = !maintenanceOn ? 'on' : 'off';
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ MAINTENANCE_MODE: next })
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      settings.mutate();
    } catch (e: any) {
      alert(e?.message || 'Erreur');
    } finally {
      setSavingMaint(false);
    }
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      {/* Carte: disponibilité du site */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-white/70">Disponibilité du site</div>
          <div className="text-base font-semibold">Mode maintenance</div>
          <div className="text-xs text-white/60">Basculez pour afficher une page “Site en maintenance” aux visiteurs (les admins voient toujours le site).</div>
        </div>
        <button onClick={toggleMaintenance} disabled={savingMaint} className={`relative inline-flex h-7 w-14 items-center rounded-full border border-white/10 ${maintenanceOn ? 'bg-amber-500/80' : 'bg-white/10'} transition-colors`}
          aria-pressed={maintenanceOn}
          aria-label="Activer/désactiver le mode maintenance">
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${maintenanceOn ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Formulaire: intégrations Stripe & Discord */}
      <div className="section-contrast p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Intégrations (Stripe & Discord)</h2>
        </div>
        <form onSubmit={saveSettings} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-white/70">Discord (URL)</label>
            <input name="DISCORD_URL" defaultValue={settings.data?.settings?.DISCORD_URL || ''} className="input w-full" placeholder="https://discord.gg/xxxxx" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-white/80">Stripe (paiement)</label>
            <p className="text-xs text-white/60">Clés disponibles dans le tableau de bord Stripe → Développeurs → Clés API. Le secret webhook est utilisé pour les webhooks (optionnel).</p>
            <p className="text-xs text-amber-200/90 mt-1">Pour le mode <strong>live</strong>, les deux clés doivent être les clés <strong>live</strong> (sk_live_... et pk_live_...). Si vous changez la clé secrète, saisissez-la en entier (elle n’est pas réaffichée).</p>
            {((settings.data?.settings?.STRIPE_PUBLISHABLE_KEY) || (settings.data?.settings?.STRIPE_SECRET_KEY)) && (
              <p className="text-xs mt-1 space-x-3">
                {settings.data?.settings?.STRIPE_PUBLISHABLE_KEY && (
                  <span>Clé publique : <span className={String(settings.data.settings.STRIPE_PUBLISHABLE_KEY).startsWith("pk_live_") ? "text-green-400" : "text-amber-400"}>{String(settings.data.settings.STRIPE_PUBLISHABLE_KEY).startsWith("pk_live_") ? "Live" : "Test"}</span></span>
                )}
                {settings.data?.settings?.STRIPE_SECRET_KEY && (
                  <span>Clé secrète : <span className={String(settings.data.settings.STRIPE_SECRET_KEY).startsWith("sk_live_") ? "text-green-400" : "text-amber-400"}>{String(settings.data.settings.STRIPE_SECRET_KEY).startsWith("sk_live_") ? "Live" : "Test"}</span></span>
                )}
                {(settings.data?.settings?.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_") && !settings.data?.settings?.STRIPE_SECRET_KEY?.startsWith("sk_live_")) && (
                  <span className="block text-amber-300 mt-0.5">→ Le moyen de paiement restera en mode test tant que la clé secrète n’est pas en live (sk_live_...).</span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Stripe Clé secrète (Secret key)</label>
            <input type="password" name="STRIPE_SECRET_KEY" defaultValue={settings.data?.settings?.STRIPE_SECRET_KEY || ''} className="input" placeholder="sk_live_... (obligatoire pour le mode live)" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Stripe Clé publique (Publishable key)</label>
            <input type="text" name="STRIPE_PUBLISHABLE_KEY" defaultValue={settings.data?.settings?.STRIPE_PUBLISHABLE_KEY || ''} className="input" placeholder="pk_live_..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-white/70">Stripe Webhook Secret (optionnel)</label>
            <input type="password" name="STRIPE_WEBHOOK_SECRET" defaultValue={settings.data?.settings?.STRIPE_WEBHOOK_SECRET || ''} className="input" placeholder="whsec_..." autoComplete="off" />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
