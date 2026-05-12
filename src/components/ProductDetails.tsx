"use client";
import Image from "next/image";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import {
  parseGameBenchmarks,
  readBenchmarkDisclaimer,
  maxBenchmarkFpsAvg,
} from "@/lib/gameBenchmarks";

export type { GameBenchmarkRow } from "@/lib/gameBenchmarks";

export type ProductDTO = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  images: { url: string; alt?: string | null }[];
  variants: { id: number; name: string; priceCents: number; stock: number }[];
  categoryName?: string;
  specs?: Record<string, unknown> | null;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Reviews types
type Review = {
  id: number;
  user: { id: number; name?: string | null } | null;
  rating: number;
  title?: string | null;
  content: string;
  createdAt: string;
};

type ReviewsResponse = {
  reviews: Review[];
  stats: { count: number; average: number };
  myReview: { id: number; rating: number; title?: string | null; content: string; createdAt: string; updatedAt: string } | null;
  canReview: boolean;
  isAuthenticated: boolean;
};

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${full} sur 5`} className="text-yellow-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

// Small accessible tooltip component (client-side)
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}>
      {children}
      {open && (
        <div role="tooltip" className="absolute z-50 right-0 bottom-full mb-2 w-72 rounded-lg bg-black/90 p-3 text-sm text-white shadow-lg">
          {content}
        </div>
      )}
    </span>
  );
}

export default function ProductDetails({ product }: { product: ProductDTO }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<number | undefined>(product.variants[0]?.id);
  // Options specific to PC products
  const [optOptimisation, setOptOptimisation] = useState(false);
  const [optWifiAdapter, setOptWifiAdapter] = useState(false);
  const add = useCart((s) => s.add);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ rating: number; title: string; content: string }>({ rating: 5, title: "", content: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch(`/api/products/${product.id}/reviews`, { cache: "no-store" });
        const data = (await res.json()) as ReviewsResponse;
        setReviewsData(data);
        if (data.myReview) {
          setForm({ rating: data.myReview.rating, title: data.myReview.title || "", content: data.myReview.content });
        }
      } catch {
        // noop
      } finally {
        setLoadingReviews(false);
      }
    };
    run();
  }, [product.id]);

  const activeImage = product.images[activeIdx]?.url ?? "/brand-hero-1.png";
  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === variantId),
    [product.variants, variantId]
  );
  const basePriceCents = selectedVariant?.priceCents ?? product.priceCents;
  // option prices (in cents)
  const OPT_OPTIMISATION = 4999; // 49.99 €
  const OPT_WIFI = 1999; // 19.99 €
  const priceCents = basePriceCents + (optOptimisation ? OPT_OPTIMISATION : 0) + (optWifiAdapter ? OPT_WIFI : 0);
  const maxStock = selectedVariant ? selectedVariant.stock : product.stock;

  const onAdd = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (maxStock <= 0) return;

    // Fly-to-cart from the main image (or button) to the cart bubble
    const srcEl = mainRef.current ?? (e?.currentTarget as HTMLElement | undefined) ?? null;
    if (srcEl && typeof window !== "undefined") {
      const rect = srcEl.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("cart:fly", {
          detail: {
            imageUrl: activeImage,
            from: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          },
        })
      );
    }

    add({
      productId: product.id,
      variantId,
      name: `${product.name}${selectedVariant ? ` — ${selectedVariant.name}` : ""}`,
      priceCents,
      quantity: qty,
      imageUrl: product.images[0]?.url,
      options: {
        optimisation: optOptimisation,
        wifiAdapter: optWifiAdapter,
      },
    });

    // Bump feedback on CTA
    const btn = e?.currentTarget;
    if (btn) {
      btn.classList.remove("btn-bump");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (btn as HTMLElement).offsetWidth;
      btn.classList.add("btn-bump");
    }
  };

  const buyNow = () => {
    if (maxStock <= 0) return;
    add({
      productId: product.id,
      variantId,
      name: `${product.name}${selectedVariant ? ` — ${selectedVariant.name}` : ""}`,
      priceCents,
      quantity: qty,
      imageUrl: product.images[0]?.url,
      options: {
        optimisation: optOptimisation,
        wifiAdapter: optWifiAdapter,
      },
    });
    router.push("/checkout");
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewsData?.isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!reviewsData?.canReview) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: form.rating, title: form.title.trim() || undefined, content: form.content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // refresh reviews
      const refreshed = await fetch(`/api/products/${product.id}/reviews`, { cache: "no-store" }).then((r) => r.json());
      setReviewsData(refreshed as ReviewsResponse);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = useMemo(() => {
    const role = isRecord(product.specs) ? (product.specs as any).role : undefined;
    if (role === "pc") return "PC de Warren";
    if (role === "component") return "Composant";
    return product.categoryName;
  }, [product.specs, product.categoryName]);

  const gameBenchmarks = useMemo(() => parseGameBenchmarks(product.specs), [product.specs]);
  const benchmarkDisclaimer = useMemo(() => readBenchmarkDisclaimer(product.specs), [product.specs]);
  const benchMaxFps = useMemo(
    () => (gameBenchmarks?.length ? maxBenchmarkFpsAvg(gameBenchmarks) : 1),
    [gameBenchmarks]
  );
  const topBenchCards = useMemo(() => {
    if (!gameBenchmarks?.length) return [];
    return [...gameBenchmarks]
      .filter((r) => r.fpsAvg != null)
      .sort((a, b) => (b.fpsAvg ?? 0) - (a.fpsAvg ?? 0))
      .slice(0, 3);
  }, [gameBenchmarks]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Gallery */}
      <section aria-label="Galerie d’images" className="space-y-3">
        <div ref={mainRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black/10">
          <Image
            src={activeImage}
            alt={product.images[activeIdx]?.alt || product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          {/* subtle overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent" />
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {product.images.map((img, i) => (
              <button
                key={i}
                aria-label={`Voir l’image ${i + 1}`}
                onClick={() => setActiveIdx(i)}
                className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border transition ${
                  activeIdx === i ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-white/10 hover:border-white/20"
                }`}
              >
                <Image src={img.url} alt={img.alt || product.name} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Details */}
      <section>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{product.name}</h1>
          {gameBenchmarks && gameBenchmarks.length > 0 && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--accent)]/45 bg-[var(--accent)]/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              Perf jeux
            </span>
          )}
        </div>
        <div className="mt-2 text-sm text-white/60">{roleLabel}</div>
        <div className="mt-4 text-3xl font-semibold text-[var(--accent)]">{formatPrice(priceCents)}</div>

        {/* Variant selector */}
        {product.variants.length > 0 && (
          <div className="mt-6">
            <label htmlFor="variant" className="block text-sm font-medium text-white/80">
              Variante
            </label>
            <select
              id="variant"
              value={variantId}
              onChange={(e) => setVariantId(Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {formatPrice(v.priceCents)} {v.stock <= 0 ? "(Rupture)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PC specific options */}
        {isRecord(product.specs) && (product.specs as any).role === "pc" && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Options</h3>
            <div className="flex flex-col gap-3">
              {/* Optimisation toggle */}
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={optOptimisation}
                    onChange={(e) => setOptOptimisation(e.target.checked)}
                    aria-pressed={optOptimisation}
                  />
                  <div className="w-12 h-6 rounded-full bg-white/10 peer-checked:bg-[var(--accent)] relative transition-colors">
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${optOptimisation ? "translate-x-6" : ""}`} />
                  </div>
                  <div className="ml-2">
                    <div className="text-white font-medium">Optimisation</div>
                    <div className="text-xs text-white/60">Préparation du PC pour les jeux (pilotes, réglages).</div>
                  </div>
                </label>

                <Tooltip content="Nous configurons le système : installation et mise à jour des pilotes, réglages Windows/Linux pour prioriser les performances de jeu et optimiser les paramètres graphiques.">
                  <button className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 focus:outline-none">❓</button>
                </Tooltip>

                <div className="ml-auto font-semibold text-white">{formatPrice(OPT_OPTIMISATION)}</div>
              </div>

              {/* Wi‑Fi adapter toggle */}
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={optWifiAdapter}
                    onChange={(e) => setOptWifiAdapter(e.target.checked)}
                    aria-pressed={optWifiAdapter}
                  />
                  <div className="w-12 h-6 rounded-full bg-white/10 peer-checked:bg-[var(--accent)] relative transition-colors">
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${optWifiAdapter ? "translate-x-6" : ""}`} />
                  </div>
                  <div className="ml-2">
                    <div className="text-white font-medium">Adaptateur Wi‑Fi</div>
                    <div className="text-xs text-white/60">Ajout d’un module Wi‑Fi (le PC n’a pas de Wi‑Fi de base).</div>
                  </div>
                </label>

                <Tooltip content="Ajout d’un module Wi‑Fi et configuration (pilotes). Utile si vous souhaitez connecter le PC en Wi‑Fi sans adaptateur externe séparé.">
                  <button className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 focus:outline-none">❓</button>
                </Tooltip>

                <div className="ml-auto font-semibold text-white">{formatPrice(OPT_WIFI)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm text-white/80" htmlFor="qty">
            Quantité
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            max={Math.max(1, maxStock)}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, maxStock))))}
            className="h-10 w-24 rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className={`text-sm ${maxStock > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {maxStock > 0 ? `${maxStock} en stock` : "Rupture de stock"}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onAdd}
            disabled={maxStock <= 0}
            className="btn-cart rounded-md px-5 py-3 font-semibold shadow-lg shadow-[var(--accent)]/20 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          >
            🛒 Ajouter au panier
          </button>
          <button
            onClick={buyNow}
            disabled={maxStock <= 0}
            className="rounded-md px-5 py-3 font-semibold bg-[var(--accent)]/90 hover:bg-[var(--accent)] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          >
            Acheter immédiatement
          </button>
          <a
            href="#specs"
            className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-5 py-3 font-medium text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Voir les spécifications
          </a>
          {gameBenchmarks && gameBenchmarks.length > 0 && (
            <a
              href="#game-benchmarks"
              className="inline-flex items-center justify-center rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-5 py-3 font-medium text-white/90 hover:bg-[var(--accent)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Performances en jeu
            </a>
          )}
        </div>

        {/* Description */}
        <div className="prose prose-invert mt-8 max-w-none">
          <p className="text-white/80 leading-relaxed">{product.description}</p>
        </div>

        {/* Performances en jeu (specs.gameBenchmarks) — placé avant les specs matériel */}
        {gameBenchmarks && gameBenchmarks.length > 0 && (
          <div id="game-benchmarks" className="mt-10 rounded-xl border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/[0.07] via-black/25 to-black/40 p-5 md:p-6">
            <h2 className="text-lg font-semibold text-white md:text-xl">Performances en jeu</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
              FPS moyens mesurés ou estimés selon la résolution et les préréglages indiqués. Le{" "}
              <strong className="text-white/85">1 % low</strong> donne une idée des creux de framerate (fluidité perçue).
            </p>
            {topBenchCards.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {topBenchCards.map((row, i) => (
                  <div
                    key={`${row.game}-${i}`}
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-4 shadow-inner shadow-black/20"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-white/45">Top perf</div>
                    <div className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-white">{row.game}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums text-[var(--accent)]">{Math.round(row.fpsAvg!)}</span>
                      <span className="text-sm font-medium text-white/50">FPS</span>
                    </div>
                    <div className="mt-2 text-xs text-white/55">
                      {[row.resolution, row.preset].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-fuchsia-500/90"
                        style={{ width: `${Math.min(100, ((row.fpsAvg ?? 0) / benchMaxFps) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/70">
                  <tr>
                    <th className="px-4 py-3 font-medium">Jeu</th>
                    <th className="px-4 py-3 font-medium">Résolution</th>
                    <th className="px-4 py-3 font-medium">Réglages</th>
                    <th className="px-4 py-3 font-medium text-right">FPS moy.</th>
                    <th className="px-4 py-3 font-medium text-right">1 % low</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell md:min-w-[140px]">Relatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {gameBenchmarks.map((row, i) => {
                    const fps = row.fpsAvg;
                    const pct = fps != null ? Math.min(100, (fps / benchMaxFps) * 100) : 0;
                    return (
                      <tr key={`${row.game}-${i}`} className="text-white/90">
                        <td className="px-4 py-3 font-medium text-white">{row.game}</td>
                        <td className="px-4 py-3 text-white/75">{row.resolution ?? "—"}</td>
                        <td className="px-4 py-3 text-white/75">{row.preset ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-white">
                          {fps != null ? Math.round(fps) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-white/65">
                          {row.fps1Low != null ? Math.round(row.fps1Low) : "—"}
                        </td>
                        <td className="hidden align-middle px-4 py-2 sm:table-cell">
                          {fps != null ? (
                            <div className="h-2 overflow-hidden rounded-full bg-white/10" title={`${Math.round(pct)} % du meilleur FPS de cette liste`}>
                              <div
                                className="h-full rounded-full bg-[var(--accent)]/75"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {benchmarkDisclaimer && (
              <p className="mt-4 text-xs leading-relaxed text-white/50">{benchmarkDisclaimer}</p>
            )}
          </div>
        )}

        {/* Specs */}
        {product.specs && isRecord(product.specs) && (
          <div id="specs" className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Caractéristiques (vue simplifiée)</h2>
            {(() => {
              const s = product.specs as Record<string, unknown>;
              const fields = [
                { key: "cpu", label: "Processeur (CPU)" },
                { key: "gpu", label: "Carte graphique (GPU)" },
                { key: "motherboard", label: "Carte mère" },
                { key: "ram", label: "Mémoire (RAM)" },
                { key: "storage", label: "Stockage" },
                { key: "psu", label: "Alimentation (PSU)" },
                { key: "os", label: "Système" },
              ] as const;
              const toText = (v: unknown) =>
                Array.isArray(v) ? (v as unknown[]).join(", ") : isRecord(v) ? JSON.stringify(v) : v != null ? String(v) : "";

              return (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fields.map(({ key, label }) =>
                    s[key] != null ? (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs uppercase tracking-wide text-white/60">{label}</label>
                        <input
                          readOnly
                          value={toText(s[key])}
                          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                      </div>
                    ) : null
                  )}

                  {Array.isArray(s.highlights) && s.highlights.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wide text-white/60">Points forts</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(s.highlights as unknown[]).map((h, i) => (
                          <span key={i} className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80">
                            {String(h)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Détails techniques (fallback) */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-white/80 hover:text-white">Détails techniques</summary>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {Object.entries(product.specs)
                  .filter(([key]) => !["gameBenchmarks", "benchmarkDisclaimer"].includes(key))
                  .map(([key, val]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">{key}</dt>
                    <dd className="mt-1 text-sm text-white">
                      {Array.isArray(val)
                        ? (val as unknown[]).join(", ")
                        : isRecord(val)
                        ? JSON.stringify(val)
                        : String(val)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        )}

        {/* Reviews */}
        <div id="reviews" className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Avis clients</h2>
            {reviewsData && (
              <div className="text-sm text-white/80">
                <Stars value={reviewsData.stats.average} />
                <span className="ml-2">{reviewsData.stats.average.toFixed(1)} / 5 • {reviewsData.stats.count} avis</span>
              </div>
            )}
          </div>

          {/* Leave a review */}
          {loadingReviews ? (
            <div className="mt-4 text-white/70 text-sm">Chargement des avis…</div>
          ) : reviewsData?.isAuthenticated ? (
            reviewsData.canReview ? (
              <form onSubmit={submitReview} className="mt-4 grid gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-white/80">Votre note</label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setForm((f) => ({ ...f, rating: i + 1 }))}
                        className="text-lg text-yellow-400"
                        aria-label={`Donner ${i + 1} étoile(s)`}
                      >
                        {i < form.rating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  placeholder="Titre (optionnel)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <textarea
                  required
                  minLength={5}
                  placeholder="Partagez votre expérience avec ce produit…"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="min-h-28 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <div className="flex items-center gap-3">
                  <button disabled={saving} className="rounded-md px-4 py-2 bg-[var(--accent)] text-white disabled:opacity-50">
                    {saving ? "Envoi…" : reviewsData?.myReview ? "Mettre à jour mon avis" : "Publier mon avis"}
                  </button>
                  {error && <span className="text-sm text-red-400">{error}</span>}
                </div>
              </form>
            ) : (
              <div className="mt-4 text-sm text-white/70">Vous devez avoir acheté ce produit pour laisser un avis.</div>
            )
          ) : (
            <div className="mt-4 text-sm text-white/70">
              <a href="/login" className="text-[var(--accent)] hover:underline">Connectez-vous</a> pour laisser un avis.
            </div>
          )}

          {/* List reviews */}
          <div className="mt-6 space-y-4">
            {reviewsData?.reviews?.length ? (
              reviewsData.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-white">{r.user?.name || "Client"}</div>
                    <Stars value={r.rating} />
                  </div>
                  {r.title && <div className="mt-1 font-semibold">{r.title}</div>}
                  <div className="mt-1 text-sm text-white/90 whitespace-pre-line">{r.content}</div>
                  <div className="mt-2 text-xs text-white/50">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/70">Pas encore d’avis pour ce produit.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
