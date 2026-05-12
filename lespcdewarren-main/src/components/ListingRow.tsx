"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin, Cpu, Gpu, MemoryStick, HardDrive, ChevronLeft, ChevronRight } from "lucide-react";

export type ListingRowData = {
  id: number;
  title: string;
  priceCents: number;
  imageUrl?: string;
  imageUrls?: string[]; // nouvelle liste d’images
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  department?: string | null;
  condition?: string | null;
  specs?: { cpu?: string; gpu?: string; ram?: string; storage?: string; storage2?: string } | null;
  isSold?: boolean;
};

function fmtPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}
function fmtKm(km?: number) {
  if (typeof km !== "number" || !isFinite(km)) return "";
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km) + " km";
}
function toTitleCase(s?: string | null) {
  if (!s) return "";
  return s
    .split(" ")
    .map((word) => word.split("-").map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("-"))
    .join(" ");
}
function capitalizeFirst(s?: string | null) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export default function ListingRow({
  l,
  badgeLabel,
  distanceKm,
}: {
  l: ListingRowData;
  badgeLabel?: string;
  distanceKm?: number;
}) {
  const specs = l.specs || ({} as any);
  // Construire une liste de puces avec icônes (comme sur les cards)
  const chips: { key: string; icon: React.ReactNode; text: string }[] = [];
  if (specs.gpu) chips.push({ key: "gpu", icon: <Gpu className="size-4 text-white/85" aria-hidden />, text: String(specs.gpu) });
  if (specs.cpu) chips.push({ key: "cpu", icon: <Cpu className="size-4 text-white/85" aria-hidden />, text: String(specs.cpu) });
  if (specs.ram) chips.push({ key: "ram", icon: <MemoryStick className="size-4 text-white/85" aria-hidden />, text: String(specs.ram) });
  if (specs.storage) chips.push({ key: "storage", icon: <HardDrive className="size-4 text-white/85" aria-hidden />, text: String(specs.storage) });
  if (specs.storage2) chips.push({ key: "storage2", icon: <HardDrive className="size-4 text-white/85" aria-hidden />, text: String(specs.storage2) });
  const highlights = chips.slice(0, 3);

  const locality = [l.zip, toTitleCase(l.city), (l.country || "").toUpperCase()].filter(Boolean).join(" ");
  const dept = l.department ? ` (${capitalizeFirst(l.department)})` : "";
  const distance = fmtKm(distanceKm);

  // Images & slider
  const imgs = (l.imageUrls && l.imageUrls.length ? l.imageUrls : (l.imageUrl ? [l.imageUrl] : [])) as string[];
  const [idx, setIdx] = useState(0);
  const hasMany = imgs.length > 1;
  const go = (delta: number) => {
    if (!imgs.length) return;
    setIdx((i) => (i + delta + imgs.length) % imgs.length);
  };

  return (
    <Link href={`/marketplace/${l.id}`} className="block">
      <article className="card overflow-hidden p-0">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Slider image à gauche */}
          <div className="relative w-full md:w-[320px] lg:w-[360px] aspect-[4/3] md:aspect-auto md:h-[200px] lg:h-[220px] shrink-0">
            {imgs[0] ? (
              <Image src={imgs[idx]} alt={l.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent" />
            {l.isSold && (
              <span className="absolute top-2 left-2 rounded bg-red-600 text-white text-[11px] font-semibold px-2 py-1" title="Vendu">Vendu</span>
            )}
            {hasMany && (
              <>
                {/* Flèches */}
                <button onClick={(e) => { e.preventDefault(); go(-1); }} aria-label="Précédent" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-1.5 text-white/90 hover:bg-black/60">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={(e) => { e.preventDefault(); go(1); }} aria-label="Suivant" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-1.5 text-white/90 hover:bg-black/60">
                  <ChevronRight className="size-5" />
                </button>
                {/* Puces */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imgs.map((_, i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${i === idx ? "bg-white" : "bg-white/60"}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Contenu à droite */}
          <div className="flex-1 p-4 md:p-5">
            <header className="flex items-start justify-between gap-3">
              <h3 className="text-base md:text-lg font-semibold leading-snug line-clamp-2">{toTitleCase(l.title)}</h3>
            </header>

            {/* Prix plus gros sous le titre */}
            <div className="mt-1 text-2xl md:text-3xl font-bold text-[var(--accent)]">{fmtPrice(l.priceCents)}</div>

            {badgeLabel ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                {badgeLabel}
              </div>
            ) : null}

            {highlights.length ? (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-sm text-white/85">
                {highlights.map((c) => (
                  <li key={c.key} className="flex items-center gap-1.5" title={c.text}>
                    {c.icon}
                    <span className="max-w-[18rem] truncate">{toTitleCase(c.text)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin className="size-4" aria-hidden />
                <span className="line-clamp-1">{[locality, dept].join("")}</span>
                {distance ? <span className="ml-2">• {distance}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
