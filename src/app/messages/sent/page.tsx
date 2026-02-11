"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MessageSentPage() {
  const sp = useSearchParams();
  const conv = sp.get("conv") || "";
  const listingId = sp.get("listing");
  const router = useRouter();

  // Charger quelques offres pertinentes (simples recommandations: dernières annonces publiées)
  const { data } = useSWR(`/api/marketplace/listings?limit=8&sort=newest`, fetcher);
  const items: any[] = data?.data || [];

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto text-center">
        <div className="card p-8">
          <h1 className="text-2xl font-bold">Message envoyé</h1>
          <p className="text-sm text-gray-400 mt-2">Votre message a bien été transmis au vendeur.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {conv ? (
              <Link href={`/messages/${conv}`} className="btn-primary">Voir ma conversation</Link>
            ) : null}
            <button onClick={() => router.back()} className="btn-ghost">Retour aux résultats</button>
            {listingId ? (
              <Link href={`/marketplace/${listingId}`} className="btn-ghost">Voir l'annonce</Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Ces annonces peuvent vous intéresser</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((l) => (
            <Link key={l.id} href={`/marketplace/${l.id}`} className="card overflow-hidden hover:scale-[1.01] transition">
              <div className="aspect-video bg-white/5">
                {Array.isArray(l.images) && l.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0].url} alt={l.title} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold line-clamp-2">{l.title}</div>
                <div className="text-xs text-gray-400 mt-1">{(l.priceCents/100).toLocaleString('fr-FR')} €</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
