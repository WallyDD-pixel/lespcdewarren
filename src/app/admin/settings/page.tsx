"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminSettingsPage() {
  const settings = useSWR('/api/admin/settings', fetcher);
  const [saving, setSaving] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);
  const [paypalEnv, setPaypalEnv] = useState('sandbox');

  // Mettre à jour l'état local quand les données sont chargées
  if (settings.data?.settings?.PAYPAL_ENV && paypalEnv !== settings.data.settings.PAYPAL_ENV) {
    setPaypalEnv(settings.data.settings.PAYPAL_ENV);
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      PAYPAL_ENV: fd.get('PAYPAL_ENV'),
      DISCORD_URL: fd.get('DISCORD_URL'),
      PAYPAL_SANDBOX_CLIENT_ID: fd.get('PAYPAL_SANDBOX_CLIENT_ID'),
      PAYPAL_SANDBOX_SECRET: fd.get('PAYPAL_SANDBOX_SECRET'),
      PAYPAL_LIVE_CLIENT_ID: fd.get('PAYPAL_LIVE_CLIENT_ID'),
      PAYPAL_LIVE_SECRET: fd.get('PAYPAL_LIVE_SECRET'),
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

      {/* Formulaire: intégrations */}
      <div className="section-contrast p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Intégrations (PayPal & Discord)</h2>
        </div>
        <form onSubmit={saveSettings} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Environnement PayPal</label>
            <select 
              name="PAYPAL_ENV" 
              value={paypalEnv} 
              onChange={(e) => setPaypalEnv(e.target.value)}
              className="input"
            >
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Discord (URL)</label>
            <input name="DISCORD_URL" defaultValue={settings.data?.settings?.DISCORD_URL || ''} className="input" placeholder="https://discord.gg/xxxxx" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">PayPal Sandbox Client ID</label>
            <input name="PAYPAL_SANDBOX_CLIENT_ID" defaultValue={settings.data?.settings?.PAYPAL_SANDBOX_CLIENT_ID || ''} className="input" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">PayPal Sandbox Secret</label>
            <input name="PAYPAL_SANDBOX_SECRET" defaultValue={settings.data?.settings?.PAYPAL_SANDBOX_SECRET || ''} className="input" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">PayPal Live Client ID</label>
            <input name="PAYPAL_LIVE_CLIENT_ID" defaultValue={settings.data?.settings?.PAYPAL_LIVE_CLIENT_ID || ''} className="input" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">PayPal Live Secret</label>
            <input name="PAYPAL_LIVE_SECRET" defaultValue={settings.data?.settings?.PAYPAL_LIVE_SECRET || ''} className="input" />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
