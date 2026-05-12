"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; message: string; type?: "success" | "info" | "error" };
let idCounter = 1;

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const add = (message: string, type?: Toast["type"]) => {
      const id = idCounter++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };

    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type?: Toast["type"] }>).detail;
      if (!detail?.message) return;
      add(detail.message, detail.type);
    };

    const onBuildAdded = (e: Event) => {
      const { count, totalCents } = (e as CustomEvent<{ count: number; totalCents?: number }>).detail || {};
      const euros = typeof totalCents === "number" ? (totalCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : undefined;
      const msg = `Configuration ajoutée au panier (${count} article${count > 1 ? "s" : ""}${euros ? ` • ${euros}` : ""})`;
      add(msg, "success");
    };

    window.addEventListener("app:toast", onToast as EventListener);
    window.addEventListener("cart:build-added", onBuildAdded as EventListener);
    return () => {
      window.removeEventListener("app:toast", onToast as EventListener);
      window.removeEventListener("cart:build-added", onBuildAdded as EventListener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[80] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="min-w-[260px] max-w-[90vw] md:max-w-sm rounded-lg border border-white/10 bg-black/80 backdrop-blur px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,.5)] text-sm text-white/90">
          <div className="flex items-start gap-3">
            <span aria-hidden>{t.type === "error" ? "⚠️" : t.type === "success" ? "✅" : "ℹ️"}</span>
            <div className="flex-1">{t.message}</div>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-white/60 hover:text-white ml-2">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
