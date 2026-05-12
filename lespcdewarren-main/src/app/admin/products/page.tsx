"use client";
import { useEffect, useState } from "react";

type CompletePC = {
  id: string | number;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  stock: number;
};

export default function AdminProductsPage() {
  const [completePCs, setCompletePCs] = useState<CompletePC[]>([]);

  useEffect(() => {
    fetch("/api/products?type=completePC")
      .then((res) => res.json())
      .then((data) => setCompletePCs(data.products || []));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-semibold">PC complets</h2>
        <button
          className="px-4 py-2 rounded bg-[var(--accent)] text-white font-bold hover:bg-[var(--accent-dark)] transition"
          onClick={() => window.location.href = "/admin/products/new"}
        >
          + Créer un produit
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
  {/* placeholder: product cards follow */}
        {completePCs.length === 0 && <div className="col-span-full text-white/70">Aucun PC complet enregistré.</div>}
        {completePCs.map((pc) => (
          <a key={pc.id} href={`/admin/products/${pc.id}`} className="p-8 rounded-3xl bg-black/20 border border-white/10 w-full sm:max-w-lg md:max-w-xl xl:max-w-md mx-auto hover:opacity-90">
            <img src={pc.imageUrl} alt={pc.name} className="h-48 w-full object-cover rounded-xl mb-4" />
            <h3 className="font-bold text-2xl mb-2">{pc.name}</h3>
            <div className="text-base text-white/80 mb-3">{pc.description}</div>
            <div className="text-[var(--accent)] font-bold text-2xl">{(pc.priceCents/100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
            <div className="text-sm text-white/60 mt-3">Stock: {pc.stock}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
