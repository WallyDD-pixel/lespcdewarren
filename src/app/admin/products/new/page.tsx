"use client";
import Link from "next/link";

export default function NewProductChooserPage() {
  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Créer un produit</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Composant (pour le builder)</h3>
          <p className="text-sm text-white/70">Produit sélectionnable dans le configurateur (/devis) avec slot et images.</p>
          <Link href="/admin/products/new/component" className="btn-primary w-full">Créer un composant</Link>
        </div>
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-lg font-semibold">PC Gamer (complet)</h3>
          <p className="text-sm text-white/70">PC complet listé dans la boutique (non utilisé par le builder).</p>
          <Link href="/admin/products/new/pc" className="btn-primary w-full">Créer un PC Gamer</Link>
        </div>
      </div>
    </div>
  );
}
