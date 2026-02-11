import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: number;
  variantId?: number;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
  options?: Record<string, unknown>;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: number, variantId?: number) => void;
  clear: () => void;
  totalCents: () => number;
  // New helpers
  count: () => number;
  setQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
  increment: (productId: number, variantId: number | undefined, delta?: number) => void;
};

// Custom event typing for TS
declare global {
  interface WindowEventMap {
    "cart:add": CustomEvent<{ item: CartItem }>;
    "cart:remove": CustomEvent<{ productId: number; variantId?: number }>;
    "cart:update": CustomEvent<{ productId: number; variantId?: number; quantity: number }>;
    "cart:clear": CustomEvent<{ previous: CartItem[] }>;
    // Fired by UI to animate a fly-to-cart from a source rect
    "cart:fly": CustomEvent<{ imageUrl?: string; from: { x: number; y: number; width: number; height: number } }>;
  }
}

const sameLine = (a: { productId: number; variantId?: number }, b: { productId: number; variantId?: number }) =>
  a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const normalized = { ...item, quantity: Math.max(1, Math.floor(item.quantity || 1)) } as CartItem;
        const items = get().items.slice();
        const idx = items.findIndex((i) => sameLine(i, normalized));
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + normalized.quantity };
        } else {
          items.push(normalized);
        }
        set({ items });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:add", { detail: { item: normalized } }));
        }
      },
      remove: (productId, variantId) => {
        const prev = get().items;
        const items = prev.filter((i) => !sameLine(i, { productId, variantId }));
        set({ items });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:remove", { detail: { productId, variantId } }));
        }
      },
      clear: () => {
        const previous = get().items;
        set({ items: [] });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:clear", { detail: { previous } }));
        }
      },
      totalCents: () => get().items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
      // New helpers
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      setQuantity: (productId, variantId, quantity) => {
        const q = Math.floor(quantity);
        const items = get().items.slice();
        const idx = items.findIndex((i) => sameLine(i, { productId, variantId }));
        if (idx < 0) return;
        if (!q || q <= 0) {
          // remove line if zero
          items.splice(idx, 1);
          set({ items });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("cart:remove", { detail: { productId, variantId } }));
          }
          return;
        }
        items[idx] = { ...items[idx], quantity: q };
        set({ items });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:update", { detail: { productId, variantId, quantity: q } }));
        }
      },
      increment: (productId, variantId, delta = 1) => {
        const items = get().items.slice();
        const idx = items.findIndex((i) => sameLine(i, { productId, variantId }));
        if (idx < 0) return;
        const next = Math.max(0, items[idx].quantity + Math.floor(delta));
        if (next <= 0) {
          items.splice(idx, 1);
          set({ items });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("cart:remove", { detail: { productId, variantId } }));
          }
          return;
        }
        items[idx] = { ...items[idx], quantity: next };
        set({ items });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:update", { detail: { productId, variantId, quantity: next } }));
        }
      },
    }),
    {
      name: "lespcdewarren:cart",
      storage: typeof window === "undefined" ? undefined : createJSONStorage(() => localStorage),
      // only persist items
      partialize: (state) => ({ items: state.items }),
      version: 1,
    }
  )
);
