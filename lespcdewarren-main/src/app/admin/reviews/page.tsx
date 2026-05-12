"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminReviewsPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/reviews", fetcher, { refreshInterval: 30000 });
  const reviews = (data?.reviews ?? []) as Array<any>;

  const toggle = async (id: number, published: boolean) => {
    await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published }) });
    mutate();
  };
  const remove = async (id: number) => {
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Avis produits</h2>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Auteur</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-4">Chargement…</td></tr>}
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-3">{r.id}</td>
                <td className="px-4 py-3">{r.product?.name}</td>
                <td className="px-4 py-3">{r.user?.name || r.user?.email}</td>
                <td className="px-4 py-3">{r.rating}/5</td>
                <td className="px-4 py-3">{r.published ? "Publié" : "Brouillon"}</td>
                <td className="px-4 py-3">{new Date(r.createdAt).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="btn-ghost" onClick={() => toggle(r.id, !r.published)}>{r.published ? "Dépublier" : "Publier"}</button>
                  <button className="btn-ghost text-red-300" onClick={() => remove(r.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && !isLoading && <tr><td colSpan={7} className="px-4 py-4">Aucun avis</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
