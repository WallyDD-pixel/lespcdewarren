"use client";
import { useEffect, useRef, useState } from "react";

// A lightweight overlay listening for `cart:fly` events and animating an image towards the cart bubble
export default function FlyToCart() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    const layer = layerRef.current!;

    const handler = (e: Event) => {
      const { imageUrl, from } = (e as CustomEvent<{ imageUrl?: string; from: { x: number; y: number; width: number; height: number } }>).detail;
      // Find destination: desktop bubble, then mobile bubble, then header cart fallback
      const destEl =
        (document.getElementById("cart-bubble-desktop") as HTMLElement | null) ||
        (document.getElementById("cart-bubble-mobile") as HTMLElement | null) ||
        (document.getElementById("header-cart") as HTMLElement | null) ||
        (document.querySelector('[aria-label^="Voir le panier"], [href="/panier"]') as HTMLElement | null);
      if (!destEl) return;
      const dest = destEl.getBoundingClientRect();

      const startX = from.x + from.width / 2;
      const startY = from.y + from.height / 2;
      const endX = dest.x + dest.width / 2;
      const endY = dest.y + dest.height / 2;

      const img = document.createElement("img");
      img.src = imageUrl || "/brand-hero-1.png";
      img.alt = "";
      img.style.position = "fixed";
      img.style.left = `${startX - from.width / 2}px`;
      img.style.top = `${startY - from.height / 2}px`;
      img.style.width = `${from.width}px`;
      img.style.height = `${from.height}px`;
      img.style.borderRadius = "12px";
      img.style.objectFit = "cover";
      img.style.pointerEvents = "none";
      img.style.boxShadow = "0 8px 24px rgba(0,0,0,.35)";
      layer.appendChild(img);

      const dx = endX - startX;
      const dy = endY - startY;
      const scale = Math.max(0.15, Math.min(0.35, dest.width / Math.max(1, from.width)));

      img.animate(
        [
          { transform: `translate(0px, 0px) scale(1)`, opacity: 1 },
          { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) scale(${Math.max(scale, 0.6)})`, opacity: 0.9, offset: 0.7 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.15 },
        ],
        { duration: 650, easing: "cubic-bezier(.22,.61,.36,1)" }
      ).finished.finally(() => {
        img.remove();
      });
    };

    window.addEventListener("cart:fly", handler as EventListener);
    return () => window.removeEventListener("cart:fly", handler as EventListener);
  }, [ready]);

  return <div ref={layerRef} className="pointer-events-none fixed inset-0 z-[70]" aria-hidden />;
}
