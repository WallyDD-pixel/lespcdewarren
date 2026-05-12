"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";

export type ProductCardData = {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl?: string;
  highlights?: string[];
  // Nouveau: liste courte des composants à afficher (prioritaire sur highlights)
  components?: string[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Icônes SVG pour les composants et le panier
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
function CartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l1 9h11l2-7H6" />
    </svg>
  );
}

const iconForIndex = (i: number, className?: string) => (i === 0 ? <CpuIcon className={className} /> : i === 1 ? <GpuIcon className={className} /> : <RamIcon className={className} />);

export default function ProductCard({ p }: { p: ProductCardData }) {
  const router = useRouter();

  const goTo = () => router.push(`/produit/${p.slug}`);

  const buyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    add({ productId: p.id, name: p.name, priceCents: p.priceCents, quantity: 1, imageUrl: p.imageUrl });
    router.push("/checkout");
  };

  const onAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Fly-to-cart: dispatch source rect and image
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
    // Bump animation on CTA
    const btn = target;
    if (btn) {
      btn.classList.remove("btn-bump");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (btn as any).offsetWidth;
      btn.classList.add("btn-bump");
    }
  };

  // Items à afficher dans le corps de la carte: composants > highlights
  const items = (p.components && p.components.length ? p.components : (p.highlights ?? [])).slice(0, 3);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goTo();
    }
  };
  const add = useCart((s) => s.add);
  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Voir ${p.name}`}
      onClick={goTo}
      onKeyDown={onKey}
      data-card
  className="group relative w-full min-w-[320px] max-w-[500px] cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      {/* Card container with glow border */}
      <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-[var(--accent)]/70 via-fuchsia-500/40 to-[var(--accent)]/70 shadow-lg shadow-[var(--accent)]/10">
        {/* Surface */}
        <div className="relative rounded-[10px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-[1px]">
          {/* Media (square ratio) */}
          <div className="relative aspect-square w-full">
            {p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 768px) 100vw, 180px" className="object-cover" />
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent" />
            {/* Quick buy */}
            <button
              onClick={buyNow}
              className="absolute bottom-2 right-2 rounded bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white text-xs font-semibold px-2 py-1 shadow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition"
            >
              Acheter
            </button>
          </div>
          {/* Content */}
          <div className="px-4 pt-4 pb-12 min-h-[80px] overflow-hidden">
            <h3 className="text-base md:text-lg font-bold tracking-tight text-white group-hover:text-white line-clamp-2">
              {p.name}
            </h3>
            {items.length > 0 && (
              <ul className="mt-2 space-y-2 text-[13px] md:text-base text-white/85">
                {items.map((txt, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/85">
                    {iconForIndex(i, "h-4 w-4 mt-0.5")}
                    <span className="opacity-90 line-clamp-1">{capFirst(String(txt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Bottom bar */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="flex h-10">
              <div className="flex-1 bg-white/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="text-base md:text-lg font-semibold tracking-tight text-[var(--accent)]">{formatPrice(p.priceCents)}</div>
              </div>
              <button
                onClick={onAdd}
                className="flex-[1.15] btn-cart px-4 text-base md:text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <div className="flex h-full w-full items-center justify-center gap-2">
                  <CartIcon className="h-4 w-4" />
                  <span>Ajouter</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
// ...existing code...
}
