"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Slide = {
  id: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string }[];
  image: string;
  align?: "left" | "center" | "right";
  position?: string; // CSS object-position (ex: "right center")
};

export default function Slider({ slides, interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => { timer.current && clearInterval(timer.current); };
  }, [slides.length, interval]);

  return (
    <div className="relative h-[460px] md:h-[640px] overflow-hidden">
      {slides.map((s, i) => (
        <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}>
          <Image src={s.image} alt={s.title} fill className="object-cover" priority={i === index} style={{ objectPosition: s.position ?? "center" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,theme(colors.purple.800)_60%,transparent)]/40 via-transparent to-transparent" />
          <div className={`absolute inset-0 flex items-center ${s.align === "right" ? "justify-end" : s.align === "center" ? "justify-center" : "justify-start"}`}>
            <div className="container z-10 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{s.title}</h2>
              {s.subtitle && <p className="mt-3 text-white/80">{s.subtitle}</p>}
              {s.cta && (
                <div className="mt-6 flex gap-3">
                  {s.cta.map((c, idx) => (
                    <Link key={c.label} href={c.href} className={idx === 0 ? "btn-primary shadow-neon" : "btn-secondary"}>{c.label}</Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* Bullets */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`h-2.5 w-2.5 rounded-full ${i === index ? "bg-[var(--accent)]" : "bg-white/60"}`} />
        ))}
      </div>
    </div>
  );
}
