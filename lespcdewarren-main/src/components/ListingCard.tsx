"use client";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Gpu, MemoryStick, HardDrive, MapPin } from "lucide-react";
import React from "react";

export type ListingCardData = {
  id: number;
  title: string;
  priceCents: number;
  imageUrl?: string;
  imageUrls?: string[]; // prise en charge multiple images
  city?: string | null;
  zip?: string | null;
  department?: string | null;
  condition?: string | null;
  specs?: { cpu?: string; gpu?: string; ram?: string; storage?: string } | null;
  distanceKm?: number; // distance optionnelle (Autour de moi)
  isSold?: boolean; // nouvel indicateur vendu
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function capitalizeFirst(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toTitleCase(s?: string | null) {
  if (!s) return "";
  return s
    .split(" ")
    .map((word) => word.split("-").map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("-"))
    .join(" ");
}

function fmtKm(km?: number) {
  if (typeof km !== "number" || !isFinite(km)) return "";
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km) + " km";
}

export default function ListingCard({ l, size = "md", badgeLabel }: { l: ListingCardData; size?: "sm" | "md"; badgeLabel?: string }) {
  const s = l.specs || ({} as any);
  const isSm = size === "sm";

  // Construire la liste ordonnée des caractéristiques à afficher
  const chips: { key: string; icon: React.ReactNode; text: string }[] = [];
  if (s.gpu) chips.push({ key: "gpu", icon: <Gpu className={isSm ? "size-3.5 text-white/85" : "size-4 text-white/85"} aria-hidden />, text: String(s.gpu) });
  if (s.cpu) chips.push({ key: "cpu", icon: <Cpu className={isSm ? "size-3.5 text-white/85" : "size-4 text-white/85"} aria-hidden />, text: String(s.cpu) });
  if (s.ram) chips.push({ key: "ram", icon: <MemoryStick className={isSm ? "size-3.5 text-white/85" : "size-4 text-white/85"} aria-hidden />, text: String(s.ram) });
  if (s.storage) chips.push({ key: "storage", icon: <HardDrive className={isSm ? "size-3.5 text-white/85" : "size-4 text-white/85"} aria-hidden />, text: String(s.storage) });
  const maxChips = isSm ? 3 : 4;
  const visibleChips = chips.slice(0, maxChips);

  const hasLocation = !!(l.city || l.zip || l.department);
  const cityTxt = toTitleCase(l.city || undefined);
  const locality = [l.zip, cityTxt].filter(Boolean).join(" ");
  const locationText = [locality, l.department ? `(${capitalizeFirst(l.department)})` : null].filter(Boolean).join(" ");

  const photoCount = Array.isArray(l.imageUrls) ? l.imageUrls.filter(Boolean).length : (l.imageUrl ? 1 : 0);

  return (
    <Link
      href={`/marketplace/${l.id}`}
      aria-label={`Voir ${l.title}`}
      className={
        isSm
          ? "group relative w-full cursor-pointer transition-transform duration-200 hover:-translate-y-1"
          : "group relative w-[320px] md:w-[360px] shrink-0 snap-start cursor-pointer transition-transform duration-200 hover:-translate-y-1"
      }
    >
      {/* Card container with glow border (same style que ProductCard) */}
      <div className="relative rounded-2xl p-[1.25px] bg-gradient-to-br from-[var(--accent)]/80 via-fuchsia-500/60 to-[var(--accent)]/80 shadow-xl shadow-[var(--accent)]/20">
        <div className="relative rounded-[15px] overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-[2px]">
          {/* Media */}
          <div className="relative aspect-square w-full overflow-hidden">
            {l.imageUrl ? (
              <Image src={l.imageUrl} alt={l.title} fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/15 to-transparent" />

            {/* Badge haut-gauche: Vendu prioritaire, sinon label personnalisé ou distance */}
            {l.isSold ? (
              <span className={isSm ? "absolute left-3 top-3 rounded bg-red-600 text-white px-2 py-0.5 text-[11px] font-semibold" : "absolute left-3 top-3 rounded bg-red-600 text-white px-2.5 py-0.5 text-xs font-semibold"} title="Vendu">Vendu</span>
            ) : (badgeLabel || typeof l.distanceKm === "number") ? (
              <span className={isSm ? "absolute left-3 top-3 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur" : "absolute left-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur"}>
                {badgeLabel ? badgeLabel : fmtKm(l.distanceKm)}
              </span>
            ) : null}

            {/* Compteur de photos en haut à droite */}
            {photoCount > 1 && (
              <span className={isSm ? "absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur" : "absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur"}>
                {photoCount} photos
              </span>
            )}

            {/* État en bas à gauche */}
            <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur">
              {l.condition ? formatCondition(l.condition) : "Occasion"}
            </span>
          </div>

          {/* Content */}
          <div className={isSm ? "px-3 pt-3 pb-16" : "px-4 pt-4 pb-16"}>
            <h3 className={
              isSm
                ? "text-sm font-bold tracking-tight text-white group-hover:text-white line-clamp-2"
                : "text-base md:text-lg font-bold tracking-tight text-white group-hover:text-white line-clamp-2"
            }>
              {toTitleCase(l.title)}
            </h3>

            {/* Specs sous le titre, avec icônes */}
            {visibleChips.length > 0 && (
              <ul className={isSm ? "mt-2 mb-1 grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px] text-white/85" : "mt-2 mb-1 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-[12px] text-white/85"}>
                {visibleChips.map((c) => (
                  <li key={c.key} className="flex min-w-0 items-center gap-1 leading-tight" title={c.text}>
                    {c.icon}
                    <span className="block min-w-0 truncate">{toTitleCase(c.text)}</span>
                  </li>
                ))}
              </ul>
            )}

            {hasLocation && (
              <div className={isSm ? "mt-2 flex items-center gap-1.5 text-xs text-white/80" : "mt-2.5 flex items-center gap-1.5 text-sm text-white/80"}>
                <MapPin className={isSm ? "size-3.5 text-white/80" : "size-4 text-white/80"} aria-hidden />
                <span className="truncate" title={locationText}>{locationText}</span>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="absolute inset-x-0 bottom-0">
            <div className={isSm ? "flex h-12" : "flex h-14"}>
              <div className={isSm ? "flex-1 bg-white/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85" : "flex-1 bg-white/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/85"}>
                <div className={isSm ? "text-lg md:text-xl font-semibold tracking-tight text-[var(--accent)]" : "text-xl md:text-2xl font-semibold tracking-tight text-[var(--accent)]"}>{formatPrice(l.priceCents)}</div>
              </div>
              <div className={isSm ? "flex-[1.15] btn-cart px-3 text-sm font-semibold flex items-center justify-center" : "flex-[1.15] btn-cart px-4 text-sm md:text-base font-semibold flex items-center justify-center"}>
                Voir
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatCondition(c?: string | null) {
  switch (c) {
    case "NEW": return "Neuf";
    case "LIKE_NEW": return "Comme neuf";
    case "VERY_GOOD": return "Très bon";
    case "GOOD": return "Bon état";
    case "FAIR": return "État correct";
    case "FOR_PARTS": return "Pour pièces";
    default: return "Occasion";
  }
}
