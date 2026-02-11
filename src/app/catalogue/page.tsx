"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";

type Product = {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl?: string;
  highlights?: string[];
  role?: string;
  specs?: Record<string, unknown>;
};

const fmt = (c: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function CpuIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
    </svg>
  );
}
function GpuIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" />
      <path d="M3 10h-1v4h1" />
    </svg>
  );
}
function RamIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M7 8V6M11 8V6M15 8V6M19 8V6M7 16v2M11 16v2M15 16v2M19 16v2" />
      <path d="M9 12h6" />
    </svg>
  );
}
const iconForIndex = (i: number) => (i === 0 ? <CpuIcon className="h-4 w-4 mt-0.5" /> : i === 1 ? <GpuIcon className="h-4 w-4 mt-0.5" /> : <RamIcon className="h-4 w-4 mt-0.5" />);

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [onlyPc, setOnlyPc] = useState(false);
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "newest">("recommended");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const add = useCart((s) => s.add);

  // Lire le paramètre pc=1 au chargement
  useEffect(() => {
    const u = new URL(window.location.href);
    const only = u.searchParams.get("pc") === "1";
    setOnlyPc(!!only);
  }, []);

  // Chargement des produits
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/products?all=1")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, []);

  const [minPrice, maxPrice] = useMemo(() => {
    if (!products.length) return [0, 0];
    const prices = products.map((p) => p.priceCents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return [min, max];
  }, [products]);

  useEffect(() => {
    if (minPrice || maxPrice) setRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice]);

  const updateOnlyPc = (next: boolean) => {
    setOnlyPc(next);
    const u = new URL(window.location.href);
    if (next) u.searchParams.set("pc", "1");
    else u.searchParams.delete("pc");
    window.history.replaceState({}, "", u.toString());
  };

  // Filtres + tri
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p: any) => (!onlyPc ? true : p?.role === "pc"))
      .filter((p) => {
        const okTerm = !term || p.name.toLowerCase().includes(term);
        const okPrice = (!range[0] || p.priceCents >= range[0]) && (!range[1] || p.priceCents <= range[1]);
        return okTerm && okPrice;
      });
  }, [products, q, range, onlyPc]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    switch (sortBy) {
      case "price_asc":
        return list.sort((a, b) => a.priceCents - b.priceCents);
      case "price_desc":
        return list.sort((a, b) => b.priceCents - a.priceCents);
      case "newest":
        // sans date, fallback: prix desc comme proxy
        return list.sort((a, b) => b.id - a.id);
      default:
        return list; // recommandé: ordre API
    }
  }, [filtered, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Remettre la page à 1 quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [q, onlyPc, range, sortBy]);
  // Clamper la page si hors bornes quand totalPages change
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const onAdd = (p: Product, e?: React.MouseEvent<HTMLButtonElement>) => {
    const target = e?.currentTarget as HTMLButtonElement | undefined;
    if (target) {
      const card = target.closest("[data-card]") as HTMLElement | null;
      const img = card?.querySelector("img");
      const rect = (img ?? card ?? target).getBoundingClientRect();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cart:fly", {
            detail: {
              imageUrl: p.imageUrl,
              from: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            },
          })
        );
      }
    }
    add({ productId: p.id, name: p.name, priceCents: p.priceCents, quantity: 1, imageUrl: p.imageUrl });
    if (target) {
      target.classList.remove("btn-bump");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (target as HTMLElement).offsetWidth;
      target.classList.add("btn-bump");
    }
  };

  const componentsOf = (p: Product) => {
    const s: any = p.specs || {};
    const items = [s.cpu, s.gpu, Array.isArray(s.ram) ? s.ram[0] : undefined]
      .filter(Boolean)
      .map(String) as string[];
    return items;
  };

  // Presets de prix (en € converti en cents)
  const presets = [
    { label: "< 700€", range: [0, 70000] as [number, number] },
    { label: "700–1000€", range: [70000, 100000] as [number, number] },
    { label: "1000–1500€", range: [100000, 150000] as [number, number] },
    { label: "> 1500€", range: [150000, Math.max(maxPrice || 150000, 150000)] as [number, number] },
  ];

  const rangeLabel = useMemo(() => {
    if (!minPrice && !maxPrice) return "";
    const [lo, hi] = range;
    if (lo <= minPrice && hi >= maxPrice) return "Tous prix";
    return `${fmt(lo)} – ${fmt(hi)}`;
  }, [range, minPrice, maxPrice]);

  const clamp = (val: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, val));
  const updateMin = (v: number) => {
    const next = clamp(v, minPrice, maxPrice);
    setRange([Math.min(next, range[1]), range[1]]);
  };
  const updateMax = (v: number) => {
    const next = clamp(v, minPrice, maxPrice);
    setRange([range[0], Math.max(next, range[0])]);
  };

  return (
    <main className="container py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{onlyPc ? "Les PC de Warren" : "Catalogue"}</h1>
          <p className="text-sm text-gray-400">{onlyPc ? "Les PC complets assemblés par Warren." : "Parcourez nos PC et composants."}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-3 w-full md:w-auto">
          <div className="relative">
            <label htmlFor="q" className="sr-only">Rechercher</label>
            <input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-md border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
          </div>
          <button
            onClick={() => updateOnlyPc(!onlyPc)}
            className={`rounded-md px-3 py-2 text-sm border ${onlyPc ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"}`}
          >
            {onlyPc ? "PC uniquement ✔" : "PC uniquement"}
          </button>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none rounded-md border border-white/15 bg-black px-3 pr-9 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="recommended">Tri: Recommandé</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="newest">Nouveautés</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60">▾</span>
          </div>
        </div>
      </div>

      {/* Presets + Filtres avancés */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const active = range[0] === p.range[0] && range[1] === p.range[1];
          return (
            <button
              key={p.label}
              onClick={() => setRange(p.range)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}

        <details className="group ml-auto w-full md:w-auto">
          <summary className="w-full md:w-auto inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition cursor-pointer [&::-webkit-details-marker]:hidden marker:content-['']">
            <span aria-hidden>🎚️</span>
            <span>Filtres avancés</span>
            {rangeLabel && (
              <span className="ml-2 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[11px] text-white/80">
                {rangeLabel}
              </span>
            )}
            <span className="ml-auto md:ml-1 text-white/60 transition-transform group-open:rotate-180">▾</span>
          </summary>

          <div className="mt-3 relative rounded-xl p-[1px] bg-gradient-to-br from-[var(--accent)]/40 via-fuchsia-500/20 to-transparent">
            <div className="rounded-[11px] border border-white/10 bg-zinc-900/70 backdrop-blur p-4">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Prix minimum */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-300">Prix minimum</label>
                    <span className="text-xs text-white/60">{fmt(range[0])}</span>
                  </div>
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    step={100}
                    value={range[0]}
                    onChange={(e) => updateMin(Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-white/50">€</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={Math.floor(minPrice / 100)}
                      max={Math.floor(maxPrice / 100)}
                      step={50}
                      value={Math.floor(range[0] / 100)}
                      onChange={(e) => updateMin(Number(e.target.value) * 100)}
                      className="w-24 rounded-md border border-white/10 bg-black px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                {/* Prix maximum */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-300">Prix maximum</label>
                    <span className="text-xs text-white/60">{fmt(range[1])}</span>
                  </div>
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    step={100}
                    value={range[1]}
                    onChange={(e) => updateMax(Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-white/50">€</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={Math.floor(minPrice / 100)}
                      max={Math.floor(maxPrice / 100)}
                      step={50}
                      value={Math.ceil(range[1] / 100)}
                      onChange={(e) => updateMax(Number(e.target.value) * 100)}
                      className="w-24 rounded-md border border-white/10 bg-black px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setRange([minPrice, maxPrice])}
                  className="text-xs text-white/70 hover:text-white underline"
                >
                  Réinitialiser
                </button>
                <div className="text-xs text-white/50">Glissez les curseurs ou saisissez un montant</div>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="bg-white/10 h-48 w-full" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
              <div className="h-11 bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !sorted.length && (
        <div className="card p-6">Aucun produit avec ces filtres.</div>
      )}

      {!isLoading && !!sorted.length && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((p) => {
              const comps = p.role === "pc" ? componentsOf(p) : [];
              const isPc = p.role === "pc";
              return (
                <div key={p.id} data-card className="group/card relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition shadow-sm hover:shadow-xl">
                  <Link href={`/produit/${p.slug}`} className="block">
                    <div className="relative w-full aspect-[4/3]">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover/card:scale-[1.03]" />
                      ) : (
                        <div className="h-full w-full bg-white/5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      {isPc && <div className="absolute top-2 left-2 chip">PC de Warren</div>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2 min-h-[2.75rem]">{p.name}</h3>
                      {comps.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-white/80">
                          {comps.slice(0,3).map((h, i) => (
                            <li key={i} className="flex gap-2 items-start">
                              {iconForIndex(i)}
                              <span className="line-clamp-1">{capFirst(String(h))}</span>
                            </li>
                          ))}
                        </ul>
                      ) : p.highlights?.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-white/80">
                          {p.highlights.slice(0, 3).map((h, i) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span aria-hidden className="mt-0.5 leading-none">•</span>
                              <span className="line-clamp-1">{capFirst(String(h))}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </Link>
                  <div className="flex items-center justify-between border-t border-white/10 p-3">
                    <div className="text-lg font-semibold text-[var(--accent)]">{fmt(p.priceCents)}</div>
                    <button onClick={(e) => onAdd(p, e)} className="btn-primary inline-flex items-center gap-2">
                      <span>Ajouter</span>
                      <span aria-hidden>＋</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination controls */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              className="px-3 py-2 rounded border bg-white/5 text-white/80 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </button>
            <span className="px-2 text-sm">Page {page} / {totalPages}</span>
            <button
              className="px-3 py-2 rounded border bg-white/5 text-white/80 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </main>
  );
}
