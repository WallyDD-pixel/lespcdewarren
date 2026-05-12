"use client";
import Link from "next/link";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import ListingRow from "@/components/ListingRow";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MarketplacePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Session utilisateur pour CTA "Vendre"
  const { data: me } = useSWR<{ user?: any }>("/api/account", fetcher);

  const [min, setMin] = useState(sp?.get("min") || "");
  const [max, setMax] = useState(sp?.get("max") || "");
  const [sort, setSort] = useState(sp?.get("sort") || "newest");
  const [page, setPage] = useState<number>(parseInt(sp?.get("page") || "1", 10) || 1);
  const [limit, setLimit] = useState<number>(parseInt(sp?.get("limit") || "9", 10) || 9);
  const [store, setStore] = useState<string>(sp?.get("store") || "");

  // Etat de chargement manuel (activé sur clic Appliquer / pagination / reset)
  const [manualLoading, setManualLoading] = useState(false);

  // Localisation: Monde | Autour de moi
  const [locMode, setLocMode] = useState<"world" | "nearby">((sp?.get("loc") as any) === "nearby" ? "nearby" : "world");
  const [lat, setLat] = useState<string>(sp?.get("lat") || "");
  const [lng, setLng] = useState<string>(sp?.get("lng") || "");
  const [radius, setRadius] = useState<string>(sp?.get("radius") || "10");

  // Valeurs appliquées (issues de l'URL) pour piloter certains comportements UI
  const appliedLocMode: "world" | "nearby" = ((sp?.get("loc") as any) === "nearby") ? "nearby" : "world";
  const appliedLimit = parseInt(sp?.get("limit") || "9", 10) || 9;

  // Sync local state when URL changes externally
  useEffect(() => {
    setMin(sp?.get("min") || "");
    setMax(sp?.get("max") || "");
    setSort(sp?.get("sort") || "newest");
    setPage(parseInt(sp?.get("page") || "1", 10) || 1);
    setLimit(parseInt(sp?.get("limit") || "9", 10) || 9);
    setStore(sp?.get("store") || "");
    setLocMode(((sp?.get("loc") as any) === "nearby") ? "nearby" : "world");
    setLat(sp?.get("lat") || "");
    setLng(sp?.get("lng") || "");
    setRadius(sp?.get("radius") || "10");
  }, [sp]);

  // IMPORTANT: l'URL SWR est basée uniquement sur les paramètres appliqués (sp), pas sur l'état local
  const url = useMemo(() => {
    const params = new URLSearchParams(sp?.toString() || "");
    // défauts
    if (!params.get("page")) params.set("page", "1");
    if (!params.get("limit")) params.set("limit", "9");
    // Forcer le tri proximité si loc=nearby
    if ((params.get("loc") || "world") === "nearby") {
      params.set("sort", "nearest");
    }
    return "/api/marketplace/listings" + (params.toString() ? `?${params.toString()}` : "");
  }, [sp]);

  // On éteint le chargement manuel à la fin de chaque requête (succès/erreur)
  const { data, isLoading, isValidating } = useSWR<{ data: any[] }>(url, fetcher, {
    onSuccess: () => setManualLoading(false),
    onError: () => setManualLoading(false),
  });
  const listings = data?.data || [];

  const apply = () => {
    setManualLoading(true);
    const params = new URLSearchParams();
    if (min) params.set("min", String(parseInt(min, 10) || ""));
    if (max) params.set("max", String(parseInt(max, 10) || ""));
    params.set("sort", locMode === "nearby" ? "nearest" : sort);
    if (store) params.set("store", store);
    params.set("page", "1");
    params.set("limit", String(limit));
    if (locMode === "nearby" && lat && lng) {
      params.set("lat", lat); params.set("lng", lng);
      if (radius) params.set("radius", String(parseFloat(radius) || ""));
      params.set("loc", "nearby");
    } else {
      params.set("loc", "world");
    }
    router.push(pathname + `?${params.toString()}`);
  };

  const reset = () => {
    setManualLoading(true);
    setMin(""); setMax(""); setSort("newest"); setPage(1); setLimit(9); setStore(""); setLocMode("world"); setLat(""); setLng(""); setRadius("10");
    router.push(pathname);
  };

  const askLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = String(pos.coords.latitude);
        const lo = String(pos.coords.longitude);
        setLat(la); setLng(lo); setLocMode("nearby");
        // Ne pas déclencher automatiquement: attendre "Appliquer"
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const goToPage = (p: number) => {
    const next = Math.max(1, p);
    setPage(next);
    setManualLoading(true);
    // Naviguer avec les filtres déjà appliqués (sp), en modifiant uniquement la page
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("page", String(next));
    if (!params.get("limit")) params.set("limit", String(limit));
    router.push(pathname + `?${params.toString()}`);
  };

  // Indicateur de chargement actif
  const loading = isLoading || isValidating || manualLoading;

  // Squelette de ligne d'annonce
  const SkeletonRow = () => (
    <div className="card overflow-hidden">
      <div className="flex gap-4">
        <div className="w-40 h-28 bg-white/5 animate-pulse rounded-md" />
        <div className="flex-1 py-2">
          <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded" />
          <div className="mt-3 h-6 w-24 bg-white/5 animate-pulse rounded" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-20 bg-white/5 animate-pulse rounded-full" />
            <div className="h-6 w-24 bg-white/5 animate-pulse rounded-full" />
            <div className="h-6 w-16 bg-white/5 animate-pulse rounded-full" />
          </div>
          <div className="mt-4 h-3 w-40 bg-white/5 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <main className="container py-8">
      {/* CTA: Vendre votre PC */}
      <div
        role="button"
        onClick={() => router.push(me?.user ? "/marketplace/new" : "/")}
        className="mb-6 relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 cursor-pointer transition-colors hover:border-[var(--accent)]/50"
        aria-label="Déposer une annonce"
        title={me?.user ? "Déposer une annonce" : "Connectez-vous pour déposer une annonce"}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/15 to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-xl md:text-2xl font-bold">Vendez aussi votre PC gamer</div>
            <div className="text-sm text-white/70">Déposez votre annonce en quelques minutes</div>
          </div>
          <div className="btn-cart px-4 py-2 rounded-md text-sm font-semibold shrink-0">Déposer une annonce</div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-sm text-gray-400">Trouvez des PC proches de chez vous ou au meilleur prix.</p>
        </div>
        {/* Filtres épurés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-auto">
          <div>
            <label className="text-xs text-gray-400">Prix min (€)</label>
            <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Prix max (€)</label>
            <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Localisation</label>
            <div className="mt-1 flex gap-2">
              <select
                value={locMode}
                onChange={(e) => {
                  const val = e.target.value as "world" | "nearby";
                  setLocMode(val);
                  // Ne pas appliquer automatiquement: attendre "Appliquer"
                }}
                className="select-dark w-full px-3 py-2 text-sm"
              >
                <option value="world">Monde</option>
                <option value="nearby">Autour de moi</option>
              </select>
              {locMode === "nearby" && (
                <button type="button" onClick={askLocation} className="btn-ghost shrink-0">Position</button>
              )}
            </div>
          </div>
          {/* Slider de rayon: visible uniquement en "Autour de moi" */}
          {locMode === "nearby" && (
            <div>
              <label className="text-xs text-gray-400 flex items-center justify-between">
                <span>Rayon</span>
                <span className="text-[11px] text-gray-500">{Number(radius) || 10} km</span>
              </label>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={Number(radius) || 10}
                onChange={(e) => setRadius(String(Math.max(1, Math.min(200, Number(e.target.value) || 10))))}
                className="range mt-2 w-full"
                style={{ accentColor: "var(--accent)", ['--range' as any]: `${Math.round(((Number(radius)||10)-1)/(200-1)*100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Ligne 2: tri + actions */}
      <div className="mb-6 flex items-center gap-3 flex-wrap md:flex-nowrap">
        <select
          value={sort}
          onChange={(e) => {
            const s = e.target.value;
            setSort(s);
            // Ne pas appliquer automatiquement: attendre "Appliquer"
          }}
          disabled={appliedLocMode === "nearby"}
          title={appliedLocMode === "nearby" ? "Tri forcé sur proximité" : undefined}
          className="select-dark px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="newest">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="priceAsc">Prix croissant</option>
          <option value="priceDesc">Prix décroissant</option>
        </select>
        <button onClick={apply} disabled={loading} className="btn-primary inline-flex items-center">
          {loading && <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Appliquer
        </button>
        <button onClick={reset} disabled={loading} className="btn-ghost">Réinitialiser</button>
      </div>

      {/* Liste en lignes */}
      {loading && (
        <div className="flex flex-col gap-5">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="card p-6">Aucune annonce avec ces filtres.</div>
      )}

      {!!listings.length && !loading && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="flex flex-col gap-5"
        >
          <AnimatePresence initial={false}>
            {listings.map((l: any) => (
              <motion.div
                key={l.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <ListingRow
                  l={{
                    id: l.id,
                    title: l.title,
                    priceCents: l.priceCents,
                    imageUrl: l.images?.[0]?.url,
                    imageUrls: Array.isArray(l.images) ? l.images.map((im: any) => im?.url).filter(Boolean) : undefined,
                    city: l.city,
                    zip: l.zip,
                    department: l?.seller?.profile?.department || null,
                    condition: l.condition || null,
                    specs: l.specs || null,
                    isSold: l.status === 'SOLD',
                  }}
                  distanceKm={Number.isFinite(l?.distanceKm) ? l.distanceKm : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {!!listings.length && !loading && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Précédent</button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button className="btn-ghost" disabled={listings.length < appliedLimit} onClick={() => goToPage(page + 1)}>Suivant</button>
        </div>
      )}
    </main>
  );
}
