"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";

const TRUSTPILOT_PROFILE_URL = process.env.NEXT_PUBLIC_TRUSTPILOT_PROFILE_URL || "https://fr.trustpilot.com/review/lespcdewarren.fr";

type Product = {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl?: string;
  highlights?: string[];
  // Nouveau: rôle du produit (pc | component)
  role?: string;
  // Inclure specs brutes reçues par l’API
  specs?: Record<string, unknown>;
};

// Testimonials types
interface Testimonial { id: number; name: string; country?: string | null; rating: number; title?: string | null; content: string; createdAt: string; experienceDate?: string | null }
interface TestimonialsRes { testimonials: Testimonial[]; stats: { count: number; average: number } }

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const { add } = useCart();

  // Nouveaux: listings d’occasion
  const [listings, setListings] = useState<any[]>([]);
  // const [slides, setSlides] = useState<any[]>([]); // supprimé

  const [testimonials, setTestimonials] = useState<TestimonialsRes | null>(null);
  // New: filter by rating
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  // Pagination PC de Warren
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  // Pagination avis clients
  const [visibleCount, setVisibleCount] = useState(8); // show 2 rows of 4 by default

  // Image héros + carte: utiliser l’image placée dans /public
  const heroImage = "/Nouveau_projet_1 (2).png";
  // Vidéo promo (chemin encodé depuis /public)
  const promoVideo = "/Pink%20%26%20Blue%20Futuristic%20Gaming%20Channel%20Youtube%20Intro.mp4";

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    fetch("/api/testimonials", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TestimonialsRes) => setTestimonials(d))
      .catch(() => setTestimonials({ testimonials: [], stats: { count: 0, average: 0 } }));
  }, []);

  useEffect(() => {
    fetch("/api/marketplace/listings?q=&store=false&mine=false", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setListings((d?.data ?? []).slice(0, 12)))
      .catch(() => setListings([]));
  }, []);

  const cards: ProductCardData[] = useMemo(() => {
    // Ne garder que les PC complets dans "Les PC de Warren"
  const featured = (products as any[]).filter((p) => p?.role === "pc");
  return featured.map((p: any) => {
      const s = p?.specs || {};
      const components = [s.cpu, s.gpu, Array.isArray(s.ram) ? s.ram[0] : undefined]
        .filter(Boolean)
        .map(String) as string[];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        highlights: p.highlights,
        components: components.length ? components : undefined,
      } as ProductCardData;
    });
  }, [products]);

  const listingCards: ListingCardData[] = useMemo(
    () =>
      listings.map((l) => ({
        id: l.id,
        title: l.title,
        priceCents: l.priceCents,
        imageUrl: l.images?.[0]?.url,
        city: l.city,
        zip: l.zip,
        department: l?.seller?.profile?.department || undefined,
        condition: l.condition,
        specs: l.specs || null,
        isSold: l.status === 'SOLD',
      })),
    [listings]
  );

  // New: rating distribution + filtered testimonials
  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const list = testimonials?.testimonials ?? [];
    for (const t of list) counts[t.rating] = (counts[t.rating] ?? 0) + 1;
    const total = testimonials?.stats?.count ?? list.length;
    return { counts, total };
  }, [testimonials]);

  const filteredTestimonials = useMemo(() => {
    const list = testimonials?.testimonials ?? [];
    if (!selectedRating) return list;
    return list.filter((t) => t.rating === selectedRating);
  }, [testimonials, selectedRating]);

  useEffect(() => {
    // reset visible when changing filter
    setVisibleCount(8);
  }, [selectedRating]);

  // Produits paginés
  const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
  const paginatedCards = cards;

  return (
    <main>
      {/* HERO image unique (sans texte) */}
      <section className="relative w-full aspect-[21/9] md:aspect-[16/6] overflow-hidden bg-black">
        <div className="absolute inset-0 p-0 md:p-4">
          <div className="relative w-full h-full">
            <Image
              src={heroImage}
              alt="Visuel — Les PC de Warren"
              fill
              priority
              quality={90}
              sizes="100vw"
              className="object-cover md:object-contain"
            />
          </div>
        </div>
      </section>

  {/* Section jeux concours retirée */}

      {/* Info bar: Livraison + Retrait + Paiements (compact) */}
      <section className="container pt-8 pb-2">
        <div className="section-contrast p-4 md:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Livraison rapide */}
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden>🚚</div>
              <div>
                <div className="font-semibold">Livraison rapide</div>
                <div className="text-sm text-white/70">Expédition 24/48h avec suivi.</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">UPS</span>
                  <span className="chip">Chronopost</span>
                </div>
              </div>
            </div>
            {/* Retrait sur place */}
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden>🏬</div>
              <div>
                <div className="font-semibold">Retrait sur place</div>
                <div className="text-sm text-white/70">Adresse communiquée après commande.</div>
              </div>
            </div>
            {/* Paiements sécurisés & PayPal */}
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden>💳</div>
              <div>
                <div className="font-semibold">Paiement sécurisé</div>
                <div className="text-sm text-white/70">PayPal (CB, 3D Secure) • 4x PayPal</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">PayPal</span>
                  <span className="chip">CB / Visa / Mastercard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remplacement des catégories rapides par une carte rectangulaire (vidéo) */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10">
          <div className="relative w-full aspect-[21/9] md:aspect-[16/6]">
            <video
              src={promoVideo}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={heroImage}
            />
          </div>
        </div>
      </section>

      {/* Marketplace promos: Sell your PC + Store refurbished */}
      <section className="container pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/marketplace/new" className="card hover-card p-6 flex items-start gap-4">
            <div className="text-3xl" aria-hidden>💻</div>
            <div>
              <h3 className="text-lg font-semibold">Vendre votre PC</h3>
              <p className="text-sm text-white/75 mt-1">Publiez votre annonce en quelques minutes et discutez avec les acheteurs.</p>
              <div className="mt-3 inline-flex items-center gap-2 text-[var(--accent)] text-sm">Publier une annonce →</div>
            </div>
          </Link>
          <Link href="/marketplace" className="card hover-card p-6 flex items-start gap-4">
            <div className="text-3xl" aria-hidden>🛠️</div>
            <div>
              <h3 className="text-lg font-semibold">Marketplace</h3>
              <p className="text-sm text-white/75 mt-1">Sélection testée par nos soins, prête à l’emploi, au meilleur prix.</p>
              <div className="mt-3 inline-flex items-center gap-2 text-[var(--accent)] text-sm">Voir le Marketplace →</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Produits en vedette en slider */}
      <section className="container pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Les PC de Warren</h2>
          <Link href="/catalogue?pc=1" className="text-sm text-[var(--accent)] hover:underline">
            Voir tout
          </Link>
        </div>
        {/* Grille 2 lignes, 6 colonnes sur desktop */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {cards.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
          {!cards.length && (
            <div className="col-span-full text-sm text-white/70">Aucun PC complet en vedette pour le moment.</div>
          )}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              className="rounded border border-white/10 px-4 py-2 text-sm text-white/70 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <span className="text-white/80 text-sm">Page {currentPage} / {totalPages}</span>
            <button
              className="rounded border border-white/10 px-4 py-2 text-sm text-white/70 disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Suivant
            </button>
          </div>
        )}
      </section>

      {/* Séparateur visuel entre rubriques */}
      <section aria-hidden className="container pb-8 -mt-4">
        <div className="relative py-4">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/70 backdrop-blur">
              Aussi sur le Marketplace
            </span>
          </div>
        </div>
      </section>

      {/* Card de présentation Marketplace (occasion + vendre) */}
      <section className="container pb-12">
        <div className="relative rounded-2xl p-[1.25px] bg-gradient-to-br from-[var(--accent)]/80 via-fuchsia-500/60 to-[var(--accent)]/80 shadow-xl shadow-[var(--accent)]/20">
          <div className="rounded-[15px] overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-[2px]">
            <div className="grid gap-6 md:grid-cols-2 p-6 md:p-8 items-center">
              <div>
                <div className="chip mb-3">Marketplace</div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Marketplace sécurisée</h2>
                <p className="mt-3 text-white/85">
                  Achetez et vendez en toute sécurité entre particuliers. Messagerie intégrée, profils vérifiés et paiements protégés.
                </p>
                <div className="mt-4 grid gap-2 text-sm text-white/80">
                  <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Messagerie sécurisée</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Profils vérifiés</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Paiements via PayPal</div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/marketplace" className="btn-primary">Voir le Marketplace</Link>
                  <Link href="/marketplace/new" className="btn-ghost">Vendre mon PC gamer</Link>
                </div>
              </div>
              <div className="relative aspect-video md:aspect-square w-full rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2 opacity-90">
                  {listingCards.slice(0, 9).map((it, i) => (
                    <div key={i} className="relative rounded overflow-hidden bg-white/10">
                      {it.imageUrl && (
                        <Image src={it.imageUrl} alt={it.title} fill sizes="(max-width: 768px) 33vw, 180px" className="object-cover" />
                      )}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 9 - Math.min(9, listingCards.length)) }).map((_, i) => (
                    <div key={`ph-${i}`} className="bg-white/10 rounded" />
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/15 to-transparent" />
                <div className="absolute bottom-3 right-3 rounded-md bg-[var(--accent)]/90 text-white text-xs font-semibold px-3 py-1.5 shadow">Sécurisé</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PC d’occasion (Marketplace) */}
      <section className="container pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Marketplace</h2>
          <Link href="/marketplace" className="text-sm text-[var(--accent)] hover:underline">
            Voir tout
          </Link>
        </div>
        {/* Grille 3x2 en petite taille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listingCards.slice(0, 6).map((l) => (
            <ListingCard key={l.id} l={l} size="sm" />
          ))}
        </div>
      </section>

      {/* Configurer votre propre PC */}
      <section className="container pb-20">
        <div className="section-contrast p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-2 items-center md:items-start flex-col md:flex-row">
            {/* Left copy */}
            <div className="mb-8 md:mb-0">
              <div className="chip mb-2">Nouveau</div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Configurer votre propre PC</h2>
              <p className="mt-3 text-white/85">
                Décrivez votre usage, votre budget et vos préférences. Nous vous proposons une configuration optimisée, prête à l’emploi.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/devis" className="btn-primary">Configurer maintenant</Link>
                <Link href="/catalogue" className="btn-ghost">Voir le catalogue</Link>
              </div>
            </div>
            {/* Right steps: grille responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              <div className="card p-4 flex flex-col items-center text-center">
                <div className="text-2xl mb-2" aria-hidden>💸</div>
                <div className="font-semibold text-white">Budget</div>
                <div className="text-sm text-white/80">Fixez votre enveloppe</div>
              </div>
              <div className="card p-4 flex flex-col items-center text-center">
                <div className="text-2xl mb-2" aria-hidden>🎮</div>
                <div className="font-semibold text-white">Usage</div>
                <div className="text-sm text-white/80">Jeux, créa, bureautique</div>
              </div>
              <div className="card p-4 flex flex-col items-center text-center">
                <div className="text-2xl mb-2" aria-hidden>✨</div>
                <div className="font-semibold text-white">Esthétique</div>
                <div className="text-sm text-white/80">Sobre, RGB, compact…</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avis internes */}
      <section className="container pb-20">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Avis clients
            {/* Faux badge style Trustpilot (sans utiliser Trustpilot) */}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <span aria-hidden>⭐</span>
              <span>Interne</span>
            </span>
          </h2>
          {testimonials && testimonials.stats ? (
            <div className="flex items-baseline gap-2 text-[var(--accent)]">
              <span className="text-2xl md:text-3xl font-extrabold tabular-nums">{testimonials.stats.average.toFixed(1)}</span>
              <span className="text-lg md:text-2xl font-semibold">/ 5</span>
              <span className="text-sm md:text-base text-white/70">• {testimonials.stats.count} avis</span>
            </div>
          ) : (
            <span className="text-sm text-[var(--accent)]" />
          )}
        </div>
        <div className="section-contrast p-4 md:p-6">
          {testimonials && testimonials.testimonials && testimonials.testimonials.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
              {/* Distribution + filtres */}
              <aside className="space-y-3 self-start">
                <div className="text-sm text-white/80">Filtrer par note</div>
                <div className="grid gap-2 w-full sm:w-72">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = distribution.counts[star] || 0;
                    const pct = distribution.total ? Math.round((count / distribution.total) * 100) : 0;
                    const active = selectedRating === star;
                    return (
                      <button
                        key={star}
                        onClick={() => setSelectedRating(active ? null : star)}
                        className={`group flex items-center gap-2 text-sm ${active ? "text-[var(--accent)]" : "text-white/80"}`}
                        aria-pressed={active}
                        aria-label={`${star} étoiles (${count})`}
                      >
                        <span className="w-12 text-left">{star}★</span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded bg-white/10">
                          <div className="absolute inset-y-0 left-0 rounded bg-yellow-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <button
                    onClick={() => setSelectedRating(null)}
                    className="text-xs text-white/60 hover:text-white underline"
                  >
                    Voir tous les avis
                  </button>
                </div>
              </aside>

              {/* Liste des avis (filtrée) */}
              <div>
                {selectedRating && (
                  <div className="mb-3 text-sm text-white/70">
                    Filtre: {selectedRating} étoile{selectedRating > 1 ? "s" : ""} • {filteredTestimonials.length} avis
                  </div>
                )}
                {filteredTestimonials.length > 0 ? (
                  <>
                    <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                      {filteredTestimonials.slice(0, visibleCount).map((t) => (
                        <li key={t.id} className="card p-4">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold truncate">{t.name}{t.country ? ` • ${t.country}` : ""}</div>
                            <div className="text-yellow-400">{"★".repeat(t.rating)}{"☆".repeat(Math.max(0, 5 - t.rating))}</div>
                          </div>
                          {t.title && <div className="mt-1 text-white/90">{t.title}</div>}
                          <p className="mt-2 text-sm text-white/80 whitespace-pre-line">{t.content}</p>
                          <div className="mt-2 text-xs text-white/50">{new Date(t.experienceDate || t.createdAt).toLocaleDateString("fr-FR")}</div>
                        </li>
                      ))}
                    </ul>
                    {filteredTestimonials.length > visibleCount && (
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() => setVisibleCount((c) => c + 8)}
                          className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                        >
                          Voir plus d’avis
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-white/70">Aucun avis pour ce filtre.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-white/70">Pas encore d’avis.</div>
          )}
        </div>
      </section>
    </main>
  );
}
