"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminUsersPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/users", fetcher, { refreshInterval: 30000 });
  const users = (data?.users ?? []) as Array<{ id: number; email: string; name?: string | null; role: string; createdAt: string }>;

  const updateRole = async (id: number, role: "USER" | "ADMIN") => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    mutate();
  };

  // Form state for creating user
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cName, setCName] = useState("");
  const [cRole, setCRole] = useState<"USER" | "ADMIN">("USER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null); setSaving(true);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: cEmail.trim(), password: cPassword, name: cName.trim() || undefined, role: cRole }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Échec de la création");
      setOk("Utilisateur créé");
      setCEmail(""); setCPassword(""); setCName(""); setCRole("USER");
      mutate();
    } catch (err: any) {
      setError(err?.message || "Erreur");
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Utilisateurs</h2>

      <form onSubmit={onCreate} className="grid gap-3 rounded-md border border-white/10 p-4 bg-black/20">
        <div className="text-sm font-medium">Créer un utilisateur</div>
        {error && <div className="text-sm text-red-400" role="alert">{error}</div>}
        {ok && <div className="text-sm text-green-400" role="status">{ok}</div>}
        <div className="grid md:grid-cols-4 gap-3">
          <input placeholder="Email" type="email" value={cEmail} onChange={(e)=>setCEmail(e.target.value)} required className="rounded border border-white/10 bg-black/30 px-3 py-2" />
          <input placeholder="Mot de passe" type="password" value={cPassword} onChange={(e)=>setCPassword(e.target.value)} required className="rounded border border-white/10 bg-black/30 px-3 py-2" />
          <input placeholder="Nom (optionnel)" value={cName} onChange={(e)=>setCName(e.target.value)} className="rounded border border-white/10 bg-black/30 px-3 py-2" />
          <select value={cRole} onChange={(e)=>setCRole(e.target.value as any)} className="rounded border border-white/10 bg-black/30 px-3 py-2">
            <option value="USER">Utilisateur</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <button disabled={saving} className="inline-flex items-center justify-center rounded-md bg-white text-black font-semibold px-4 py-2 hover:bg-white/90 disabled:opacity-60">
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-4">Chargement…</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3 break-all">{u.email}</td>
                <td className="px-4 py-3">{u.name || "—"}</td>
                <td className="px-4 py-3">
                  <select className="rounded border border-white/10 bg-black/40 px-2 py-1" value={u.role} onChange={(e) => updateRole(u.id, e.target.value as any)}>
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
            {users.length === 0 && !isLoading && <tr><td colSpan={5} className="px-4 py-4">Aucun utilisateur</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
