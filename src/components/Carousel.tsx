"use client";
import { PropsWithChildren, useRef } from "react";

export default function Carousel({ children }: PropsWithChildren) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (delta: number) => ref.current?.scrollBy({ left: delta, behavior: "smooth" });
  const getDelta = () => Math.max(240, Math.floor((ref.current?.clientWidth ?? 400) * 0.9));

  return (
    <div className="relative">
      {/* Gradient fades on edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/60 to-transparent hidden md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/60 to-transparent hidden md:block" />

      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-2 md:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <button
        aria-label="Précédent"
        onClick={() => scrollBy(-getDelta())}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white shadow-lg ring-1 ring-white/20 transition"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        aria-label="Suivant"
        onClick={() => scrollBy(getDelta())}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/80 hover:bg-[var(--accent)] text-white shadow-lg ring-1 ring-white/20 transition"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
