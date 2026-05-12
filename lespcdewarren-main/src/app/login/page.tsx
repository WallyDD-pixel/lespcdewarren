"use client";
import { useState } from "react";
import Link from "next/link";

function LoginForm({ nextParam, justRegistered }: { nextParam?: string; justRegistered?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      const role = data?.user?.role as string | undefined;
      let next = nextParam;
      if (!next) {
        next = role === "ADMIN" ? "/admin" : "/account";
      } else if (next.startsWith("/admin") && role !== "ADMIN") {
        // Évite la boucle vers /login si l'utilisateur n'est pas admin
        next = "/account";
      }
      window.location.href = next;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerHref = nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register";

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      {justRegistered && (
        <div className="text-green-400 text-sm">Compte créé avec succès. Vous pouvez maintenant vous connecter.</div>
      )}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
      </div>
      <div>
        <label className="block text-sm mb-1">Mot de passe</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]" />
      </div>
      <button disabled={loading} className="btn-cart rounded-md px-5 py-3 font-semibold disabled:opacity-50">{loading ? "Connexion..." : "Se connecter"}</button>
      <p className="text-sm text-white/70">
        Pas de compte ? {" "}
        <Link href={registerHref} className="text-[var(--accent)] underline-offset-2 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || undefined;
  const justRegistered = searchParams.get("registered") === "1";

  return (
    <div className="container py-10 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Connexion</h1>
      <LoginForm nextParam={nextParam} justRegistered={justRegistered} />
    </div>
  );
}
