"use client";
import { useState } from "react";

export default function MaintenanceAdminLoginForm() {
  // Login admin uniquement (onglet création masqué)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur");
      const role = data?.user?.role as string | undefined;
      if (role !== "ADMIN") {
        await fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" }, credentials: "same-origin" }).catch(() => {});
        throw new Error("Accès réservé aux administrateurs");
      }
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-2 grid gap-4 text-left max-w-sm">
      {/* Onglets masqués: on affiche uniquement la connexion admin */}
      <div className="text-sm text-white/70">Connexion administrateur</div>

      <form onSubmit={onSubmit} className="grid gap-3">
        {error && <div className="text-red-400 text-sm" role="alert">{error}</div>}
        <div>
          <label className="block text-xs mb-1 text-white/70">Email administrateur</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-white/70">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <button disabled={loading} className="inline-flex items-center justify-center rounded-md bg-white text-black font-semibold px-4 py-2 hover:bg-white/90 disabled:opacity-60">
          {loading ? "Connexion…" : "Se connecter (admin)"}
        </button>
      </form>
    </div>
  );
}
