"use client";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";
import { motion } from "framer-motion";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function formatJoined(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function SellerPage() {
  const { id } = useParams() as { id: string };
  const { data, isLoading } = useSWR<{ seller: any; listings: any[]; listingsCount: number; reviews: any[] }>(`/api/marketplace/sellers/${id}`, fetcher);

  if (isLoading || !data) {
    return <div className="container p-6">Chargement…</div>;
  }
  if ((data as any)?.error) return <div className="container p-6">Introuvable</div>;

  const { seller, listings, listingsCount, reviews } = data;
  const location = [seller?.profile?.city, seller?.profile?.zip].filter(Boolean).join(" ");

  return (
    <div className="container p-6 space-y-6">
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10 grid place-items-center text-lg font-semibold">
            {(seller?.name || "V").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-lg">{seller?.name || "Vendeur"}</div>
            <div className="text-sm text-white/60">Membre depuis {seller?.createdAt ? formatJoined(seller.createdAt) : "—"}</div>
            {location ? <div className="text-sm text-white/60">{location}</div> : null}
          </div>
        </div>
        <div className="text-sm text-white/70">{listingsCount} annonce{listingsCount > 1 ? "s" : ""}</div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Annonces</h2>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {listings.map((l) => {
            const card: ListingCardData = {
              id: l.id,
              title: l.title,
              priceCents: l.priceCents,
              imageUrl: l.images?.[0]?.url,
              imageUrls: Array.isArray(l.images) ? l.images.map((im: any) => im?.url).filter(Boolean) : undefined,
              city: l.city || seller?.profile?.city || null,
              zip: l.zip || seller?.profile?.zip || null,
              department: seller?.profile?.department || null,
              condition: l.condition || null,
              specs: l.specs || null,
            };
            return (
              <motion.div key={l.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <ListingCard l={card} size="sm" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Avis de ce vendeur</h2>
        {!reviews?.length ? (
          <div className="text-white/70">Pas encore d’avis.</div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r: any) => (
              <li key={r.id} className="card p-4 flex gap-3">
                <div className="h-12 w-12 rounded bg-white/5 overflow-hidden">{r.product?.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.product.images[0].url} alt="" className="w-full h-full object-cover" />
                ) : null}</div>
                <div className="min-w-0">
                  <div className="text-sm text-white/80">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</div>
                  <div className="font-medium"><Link href={`/produit/${r.product?.slug}`} className="hover:underline">{r.product?.name}</Link></div>
                  <div className="text-sm text-white/80">{"★".repeat(r.rating)}{"☆".repeat(Math.max(0, 5 - r.rating))}</div>
                  {r.title ? <div className="text-sm mt-1">{r.title}</div> : null}
                  <div className="text-sm text-white/80 whitespace-pre-line mt-1">{r.content}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
