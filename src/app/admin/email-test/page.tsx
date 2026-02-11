"use client";
import { useState } from "react";

export default function AdminEmailTestPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ to, subject, html: message }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Erreur");
      setResult(`Envoyé: ${j.id}`);
    } catch (e: any) {
      setResult(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Test Email</h1>
      <form onSubmit={onSubmit} className="grid gap-4">
        <div>
          <label className="block text-sm mb-1">Destinataire</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} type="email" required className="input" placeholder="client@example.com" />
        </div>
        <div>
          <label className="block text-sm mb-1">Sujet</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="Sujet du message" />
        </div>
        <div>
          <label className="block text-sm mb-1">Message (HTML accepté)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input min-h-40" placeholder="Bonjour…"></textarea>
        </div>
        <div className="flex justify-end gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Envoi…" : "Envoyer"}</button>
        </div>
      </form>
      {result && <div className="mt-4 text-sm">{result}</div>}
    </div>
  );
}
