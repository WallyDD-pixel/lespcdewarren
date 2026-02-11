"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";

// Types from /api/products
type ApiProduct = {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl?: string;
  highlights?: string[];
  specs?: Record<string, unknown>;
  // Nouveau: métadonnées exposées par /api/products
  role?: string;
  slot?: string;
};

const fmt = (c: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);

type SlotKey =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "cooler"
  | "storage"
  | "case"
  | "psu";

// Constantes de slots (restituées)
const SLOTS: { key: SlotKey; label: string; keywords: string[] }[] = [
  { key: "cpu", label: "Processeur", keywords: ["ryzen", "intel", "core i", "i3", "i5", "i7", "i9", "cpu", "processeur"] },
  { key: "gpu", label: "Carte graphique", keywords: ["rtx", "gtx", "rx", "radeon", "geforce", "carte graphique", "gpu"] },
  {
    key: "motherboard",
    label: "Carte mère",
    keywords: [
      "carte mère",
      "motherboard",
      "mini-itx",
      "m-atx",
      "micro atx",
      "atx",
      "am4",
      "am5",
      "lga1700",
      "lga1200",
      "b450",
      "b550",
      "x570",
      "b650",
      "x670",
      "z690",
      "z790",
    ],
  },
  { key: "ram", label: "Mémoire RAM", keywords: ["ddr4", "ddr5", "ram", "sodimm", "mémoire"] },
  { key: "cooler", label: "Ventirad / Refroidissement", keywords: ["ventirad", "cooler", "aio", "watercooling", "radiateur", "refroidissement"] },
  { key: "storage", label: "Stockage", keywords: ["ssd", "nvme", "m.2", "hdd", "disque", "stockage"] },
  { key: "case", label: "Boîtier", keywords: ["boîtier", "boitier", "case"] },
  { key: "psu", label: "Alimentation", keywords: ["alimentation", "psu", "80+", "80 plus", "w", "bronze", "gold", "platinum"] },
];

// Helpers de recherche (restitués)
function normalizeText(obj?: unknown): string {
  try {
    if (!obj) return "";
    if (typeof obj === "string") return obj.toLowerCase();
    if (Array.isArray(obj)) return obj.map((v) => normalizeText(v)).join(" ");
    if (typeof obj === "object") return Object.values(obj as Record<string, unknown>).map((v) => normalizeText(v)).join(" ");
    return String(obj).toLowerCase();
  } catch {
    return "";
  }
}
function productMatches(p: ApiProduct, keywords: string[]) {
  const hay = `${p.name} ${normalizeText((p as any).specs)} ${normalizeText(p.highlights)}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}
function haystack(p: ApiProduct) {
  return `${p.name} ${normalizeText(p.specs)} ${normalizeText(p.highlights)}`.toLowerCase();
}

// Helpers: lecture souple des specs
function pickFirst<T = any>(obj: any, keys: string[], def?: any): T | undefined {
  if (!obj) return def as any;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return def as any;
}
function toNum(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, ".").match(/[0-9]+(\.[0-9]+)?/);
    return m ? parseFloat(m[0]) : 0;
  }
  return 0;
}
function toStr(v: any): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return v ? String(v).trim() : "";
}
function toArrStr(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => toStr(x));
  if (typeof v === "string") return v.split(/[,|/]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeId(v?: string) {
  if (!v) return undefined;
  let s = v.toLowerCase().trim();
  // Unifier séparateurs et retirer accents éventuels
  s = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  // Variantes communes (lga 1700, lga-1700, am 4, am-4, am4+)
  s = s.replace(/\s+|_/g, "");
  s = s.replace(/\+/g, "plus");
  // Corriger formes usuelles
  s = s.replace(/^lga(\d{3,4})$/i, (_m, d) => `lga${d}`);
  s = s.replace(/^am(\d+)(plus)?$/i, (_m, d, p) => `am${d}${p ? "plus" : ""}`);
  s = s.replace(/^fm(\d+)(plus)?$/i, (_m, d, p) => `fm${d}${p ? "plus" : ""}`);
  return s.replace(/[^a-z0-9]/g, "");
}

// Heuristique: déduire le socket depuis le texte (nom, highlights, specs brut)
function guessSocketFromText(text?: string): string | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  // LGA ####
  const mLga = t.match(/\blga\s*[- ]?\s*(\d{3,4})\b/i);
  if (mLga) return `lga${mLga[1]}`;
  // AM4 / AM5 / AM3+
  const mAm = t.match(/\bam\s*[- ]?\s*(\d\+?)\b/i);
  if (mAm) return `am${mAm[1].replace(/\+/, "plus")}`;
  // TR4 / sTRX4
  if (/\bstrx4\b/i.test(t)) return "strx4";
  if (/\btr4\b/i.test(t)) return "tr4";
  // FM2 / FM2+
  const mFm = t.match(/\bfm\s*[- ]?\s*(2\+?)\b/i);
  if (mFm) return `fm${mFm[1].replace(/\+/, "plus")}`;

  // Mappage chipsets → sockets
  const toSocket = (socket: string) => socket;
  const hasAny = (re: RegExp) => re.test(t);
  // AM4 chipsets
  if (hasAny(/\b(a320|a520|b350|b450|b550|x370|x470|x570)\b/i)) return toSocket("am4");
  // AM5 chipsets
  if (hasAny(/\b(a620|b650|x670|x670e)\b/i)) return toSocket("am5");
  // LGA1700 chipsets
  if (hasAny(/\b(z690|z790|b660|b760|h610|h670|h770|q670|w680)\b/i)) return toSocket("lga1700");
  // LGA1200 chipsets
  if (hasAny(/\b(z490|z590|b460|b560|h410|h510|h570)\b/i)) return toSocket("lga1200");

  return undefined;
}
function guessSocketFromProduct(p?: ApiProduct): string | undefined {
  if (!p) return undefined;
  const text = haystack(p);
  return guessSocketFromText(text);
}

function cpuSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  let socket = normalizeId(toStr(pickFirst(s, ["socket", "socle", "cpuSocket"])));
  if (!socket) socket = normalizeId(guessSocketFromProduct(p));
  return {
    socket,
    tdpW: toNum(pickFirst(s, ["tdpW", "tdp", "powerTdpW"])) || 0,
  };
}
function mbSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  const ffRaw = toStr(pickFirst(s, ["formFactor", "factor", "format"]))?.toLowerCase();
  const ff = ffRaw?.replace("micro-atx", "matx").replace("micro atx", "matx");
  let socket = normalizeId(toStr(pickFirst(s, ["socket", "mbSocket"])));
  if (!socket) socket = normalizeId(guessSocketFromProduct(p));
  return {
    socket,
    ramType: toStr(pickFirst(s, ["ramType", "memoryType"]))?.toLowerCase(),
    maxRamSpeed: toNum(pickFirst(s, ["maxRamSpeed", "ramMaxSpeed", "maxMemorySpeed"])) || 0,
    formFactor: ff,
    m2Slots: toNum(pickFirst(s, ["m2Slots", "m.2Slots", "nvmeSlots", "m2"])) || 0,
    sataPorts: toNum(pickFirst(s, ["sataPorts", "sata"])) || 0,
  };
}
function ramSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  return {
    type: toStr(pickFirst(s, ["type", "ramType", "memoryType"]))?.toLowerCase(),
    speed: toNum(pickFirst(s, ["speed", "mhz", "freq"])) || 0,
  };
}
function gpuSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  return {
    lengthMm: toNum(pickFirst(s, ["lengthMm", "length", "gpuLengthMm"])) || 0,
    tdpW: toNum(pickFirst(s, ["tdpW", "tdp"])) || 0,
  };
}
function caseSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  const supported = toArrStr(pickFirst(s, ["supportedFormFactors", "formFactors", "formatsSupportes"]))
    .map((x) => x.toLowerCase().replace("micro-atx", "matx").replace("micro atx", "matx"));
  return {
    supportedFormFactors: supported.length ? supported : toArrStr(pickFirst(s, ["supported", "compatibles"]))?.map((x) => x.toLowerCase()),
    maxGpuLengthMm: toNum(pickFirst(s, ["maxGpuLengthMm", "gpuMaxLengthMm", "gpuLengthMaxMm"])) || 0,
    maxCoolerHeightMm: toNum(pickFirst(s, ["maxCoolerHeightMm", "coolerMaxHeightMm"])) || 0,
    psuFormFactor: toStr(pickFirst(s, ["psuFormFactor", "psuType"]))?.toLowerCase(),
  };
}
function coolerSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  return {
    supportedSockets: toArrStr(pickFirst(s, ["supportedSockets", "sockets", "compatibles"]))?.map((x) => normalizeId(toStr(x))).filter(Boolean) as string[],
    heightMm: toNum(pickFirst(s, ["heightMm", "height"])) || 0,
    tdpSupportW: toNum(pickFirst(s, ["tdpSupportW", "tdpMax", "coolingCapacityW"])) || 0,
  };
}
function storageSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  const iface = toStr(pickFirst(s, ["interface", "type"]))?.toLowerCase();
  return { iface };
}
function psuSpec(p?: ApiProduct) {
  const s: any = p?.specs || {};
  return {
    wattage: toNum(pickFirst(s, ["wattage", "powerW", "puissanceW"])) || 0,
    formFactor: toStr(pickFirst(s, ["formFactor", "type"]))?.toLowerCase(),
  };
}

// Contraintes dérivées depuis la sélection courante
type Constraints = {
  socket?: string;
  ramType?: string;
  maxRamSpeed?: number;
  mbFormFactor?: string;
  caseSupported?: string[];
  maxGpuLen?: number;
  maxCoolerHeight?: number;
  psuFormFactor?: string;
  m2Available?: boolean;
  sataAvailable?: boolean;
  powerMin?: number; // PSU requis minimal
};
function deriveConstraints(sel: Partial<Record<SlotKey, ApiProduct>>): Constraints {
  const cpu = cpuSpec(sel.cpu);
  const mb = mbSpec(sel.motherboard);
  const ram = ramSpec(sel.ram);
  const gpu = gpuSpec(sel.gpu);
  const kase = caseSpec(sel.case);
  const cooler = coolerSpec(sel.cooler);
  const psu = psuSpec(sel.psu);

  const socket = (mb.socket || cpu.socket) || undefined;
  const ramType = (mb.ramType || ram.type) || undefined;
  const maxRamSpeed = mb.maxRamSpeed || undefined;
  const mbFormFactor = mb.formFactor || undefined;
  const caseSupported = kase.supportedFormFactors && kase.supportedFormFactors.length ? kase.supportedFormFactors : undefined;
  const maxGpuLen = kase.maxGpuLengthMm || undefined;
  const maxCoolerHeight = kase.maxCoolerHeightMm || undefined;
  const psuFormFactor = kase.psuFormFactor || psu.formFactor || undefined;
  const m2Available = (mb.m2Slots ?? 0) > 0 ? true : undefined;
  const sataAvailable = (mb.sataPorts ?? 0) > 0 ? true : undefined;
  const powerMin = (cpu.tdpW || gpu.tdpW) ? Math.round(((cpu.tdpW || 0) + (gpu.tdpW || 0) + 50) * 1.6) : undefined;

  return { socket, ramType, maxRamSpeed, mbFormFactor, caseSupported, maxGpuLen, maxCoolerHeight, psuFormFactor, m2Available, sataAvailable, powerMin };
}

function checkCompatibility(slot: SlotKey, p: ApiProduct, c: Constraints) {
  const reasons: string[] = [];
  const cpu = cpuSpec(slot === "cpu" ? p : undefined);
  const mb = mbSpec(slot === "motherboard" ? p : undefined);
  const ram = ramSpec(slot === "ram" ? p : undefined);
  const gpu = gpuSpec(slot === "gpu" ? p : undefined);
  const kase = caseSpec(slot === "case" ? p : undefined);
  const cooler = coolerSpec(slot === "cooler" ? p : undefined);
  const stor = storageSpec(slot === "storage" ? p : undefined);
  const psu = psuSpec(slot === "psu" ? p : undefined);

  switch (slot) {
    case "cpu":
      if (c.socket) {
        if (!cpu.socket) reasons.push("Socket inconnu");
        else if (cpu.socket !== c.socket) reasons.push(`Socket ${cpu.socket.toUpperCase()} ≠ ${c.socket.toUpperCase()}`);
      }
      break;
    case "motherboard":
      if (c.socket) {
        if (!mb.socket) reasons.push("Socket inconnu");
        else if (mb.socket !== c.socket) reasons.push(`Socket ${mb.socket.toUpperCase()} ≠ ${c.socket.toUpperCase()}`);
      }
      if (c.ramType) {
        if (!mb.ramType) reasons.push("Type RAM inconnu");
        else if (mb.ramType !== c.ramType) reasons.push(`RAM ${mb.ramType.toUpperCase()} ≠ ${c.ramType.toUpperCase()}`);
      }
      if (c.mbFormFactor && c.caseSupported) {
        if (!mb.formFactor) reasons.push("Form factor carte mère inconnu");
        else if (!c.caseSupported.includes(mb.formFactor)) reasons.push(`Form factor ${mb.formFactor.toUpperCase()} non supporté par le boîtier`);
      }
      break;
    case "ram":
      if (c.ramType) {
        if (!ram.type) reasons.push("Type RAM inconnu");
        else if (ram.type !== c.ramType) reasons.push(`Type RAM ${ram.type.toUpperCase()} ≠ ${c.ramType.toUpperCase()}`);
      }
      if (c.maxRamSpeed) {
        if (!ram.speed) reasons.push("Vitesse RAM inconnue");
        else if (ram.speed > c.maxRamSpeed) reasons.push(`RAM ${ram.speed}MHz > ${c.maxRamSpeed}MHz`);
      }
      break;
    case "case":
      if (c.mbFormFactor) {
        if (!kase.supportedFormFactors || !kase.supportedFormFactors.length) reasons.push("Compatibilité boîtier inconnue");
        else if (!kase.supportedFormFactors.includes(c.mbFormFactor)) reasons.push(`Boîtier n'accepte pas ${c.mbFormFactor.toUpperCase()}`);
      }
      break;
    case "gpu":
      if (c.maxGpuLen) {
        if (!gpu.lengthMm) reasons.push("Longueur GPU inconnue");
        else if (gpu.lengthMm > c.maxGpuLen) reasons.push(`GPU ${gpu.lengthMm}mm > ${c.maxGpuLen}mm du boîtier`);
      }
      break;
    case "cooler":
      if (c.socket) {
        if (!cooler.supportedSockets || !cooler.supportedSockets.length) reasons.push("Sockets ventirad inconnus");
        else if (!cooler.supportedSockets.includes(c.socket)) reasons.push(`Ventirad non compatible ${c.socket.toUpperCase()}`);
      }
      if (c.maxCoolerHeight) {
        if (!cooler.heightMm) reasons.push("Hauteur ventirad inconnue");
        else if (cooler.heightMm > c.maxCoolerHeight) reasons.push(`Hauteur ${cooler.heightMm}mm > ${c.maxCoolerHeight}mm du boîtier`);
      }
      break;
    case "storage":
      if (stor.iface?.includes("nvme") || stor.iface?.includes("m.2") || stor.iface?.includes("m2")) {
        if (c.m2Available === false) reasons.push("Aucun slot M.2 disponible");
      } else if (stor.iface?.includes("sata")) {
        if (c.sataAvailable === false) reasons.push("Aucun port SATA disponible");
      } else {
        if (c.m2Available === false || c.sataAvailable === false) reasons.push("Interface stockage inconnue");
      }
      break;
    case "psu":
      if (c.powerMin) {
        if (!psu.wattage) reasons.push("Puissance PSU inconnue");
        else if (psu.wattage < c.powerMin) reasons.push(`PSU ${psu.wattage}W < ${c.powerMin}W requis`);
      }
      if (c.psuFormFactor) {
        if (!psu.formFactor) reasons.push("Format PSU inconnu");
        else if (psu.formFactor !== c.psuFormFactor) reasons.push(`PSU ${psu.formFactor.toUpperCase()} ≠ ${c.psuFormFactor.toUpperCase()}`);
      }
      break;
  }

  return { ok: reasons.length === 0, reasons } as { ok: boolean; reasons: string[] };
}

// Raccourcir les raisons pour n'afficher que les sockets quand c'est pertinent
function shortSocketReason(reason: string): string {
  if (reason.toLowerCase().startsWith("socket ")) return reason.replace(/^socket\s+/i, "");
  return reason;
}
function pickShortReason(reasons: string[]): string {
  const sok = reasons.find((r) => r.toLowerCase().startsWith("socket "));
  return sok ? shortSocketReason(sok) : (reasons[0] || "Incompatible");
}

function constraintChips(c: Constraints): string[] {
  const chips: string[] = [];
  if (c.socket) chips.push(`Socket ${c.socket.toUpperCase()}`);
  if (c.ramType) chips.push(`RAM ${c.ramType.toUpperCase()}${c.maxRamSpeed ? ` ≤ ${c.maxRamSpeed}MHz` : ""}`);
  if (c.mbFormFactor) chips.push(`MB ${c.mbFormFactor.toUpperCase()}`);
  if (c.maxGpuLen) chips.push(`GPU ≤ ${c.maxGpuLen}mm`);
  if (c.maxCoolerHeight) chips.push(`Ventirad ≤ ${c.maxCoolerHeight}mm`);
  if (c.psuFormFactor) chips.push(`PSU ${c.psuFormFactor.toUpperCase()}`);
  if (c.powerMin) chips.push(`PSU ≥ ${c.powerMin}W`);
  if (c.m2Available === false) chips.push("M.2 indisponible");
  if (c.sataAvailable === false) chips.push("SATA indisponible");
  return chips;
}

export default function DevisPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openSlot, setOpenSlot] = useState<SlotKey | null>(null);
  const [selections, setSelections] = useState<Partial<Record<SlotKey, ApiProduct>>>({});
  const [search, setSearch] = useState<Partial<Record<SlotKey, string>>>({});
  const [sort, setSort] = useState<Partial<Record<SlotKey, "relevance" | "priceAsc" | "priceDesc">>>({});
  const [tier, setTier] = useState<Partial<Record<SlotKey, "all" | "budget" | "mid" | "high">>>({});
  const [showIncompat, setShowIncompat] = useState(false);
  const add = useCart((s) => s.add);

  // Nouveau: état de recomputation locale pour afficher un chargement lors du filtrage
  const [recomputing, setRecomputing] = useState<Partial<Record<SlotKey, boolean>>>({});
  const flashRecompute = (keys: SlotKey[], ms = 350) => {
    setRecomputing((r) => {
      const next = { ...r } as Partial<Record<SlotKey, boolean>>;
      keys.forEach((k) => (next[k] = true));
      return next;
    });
    setTimeout(() => {
      setRecomputing((r) => {
        const next = { ...r } as Partial<Record<SlotKey, boolean>>;
        keys.forEach((k) => (next[k] = false));
        return next;
      });
    }, ms);
  };

  useEffect(() => {
    fetch("/api/products?all=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<SlotKey, ApiProduct[]>();
    for (const slot of SLOTS) map.set(slot.key, []);
    for (const p of products) {
      const anyP: any = p as any;
      // Exclure les PC complets marqués role=pc
      if (anyP.role === "pc") continue;
      // Quick skip pour "PC complets" si le nom inclut PC Gamer
      const lower = p.name.toLowerCase();
      const isCompletePc = lower.includes("pc gamer") || lower.includes("pc complet");
      if (isCompletePc) continue;

      // Nouveau: placement direct selon le slot metadata si présent
      const metaSlot = anyP.slot as SlotKey | undefined;
      if (metaSlot && (SLOTS as any[]).some((s) => s.key === metaSlot)) {
        map.get(metaSlot)!.push(p);
        continue;
      }

      // Fallback: tentative par mots-clés
      for (const slot of SLOTS) {
        if (productMatches(p, slot.keywords)) {
          map.get(slot.key)!.push(p);
          break;
        }
      }
    }
    return map;
  }, [products]);

  const total = useMemo(
    () => Object.values(selections).reduce((sum, p) => sum + (p?.priceCents ?? 0), 0),
    [selections]
  );

  const selectedCount = useMemo(() => Object.values(selections).filter(Boolean).length, [selections]);
  const progress = Math.round((selectedCount / SLOTS.length) * 100);

  const goToPrevSlot = (current: SlotKey) => {
    const idx = SLOTS.findIndex((s) => s.key === current);
    const prev = SLOTS[idx - 1] ?? SLOTS[SLOTS.length - 1];
    setOpenSlot(prev.key);
  };

  const goToNextSlot = (current: SlotKey) => {
    const idx = SLOTS.findIndex((s) => s.key === current);
    const next = SLOTS[idx + 1] ?? SLOTS[0];
    setOpenSlot(next.key);
  };

  const goToNextUnselected = (current: SlotKey, nextSel?: Partial<Record<SlotKey, ApiProduct>>) => {
    const sel = nextSel ?? selections;
    const idx = SLOTS.findIndex((s) => s.key === current);
    const after = SLOTS.slice(idx + 1).concat(SLOTS.slice(0, idx + 1));
    const next = after.find((s) => !sel[s.key]);
    setOpenSlot(next?.key ?? null);
  };

  const pick = (slot: SlotKey, p: ApiProduct) => {
    setSelections((prev) => {
      const nextSel = { ...prev, [slot]: p };
      // Déclencher un petit état de chargement pour l'autre slot CPU↔MB
      if (slot === "cpu") flashRecompute(["motherboard"]);
      if (slot === "motherboard") flashRecompute(["cpu"]);
      goToNextUnselected(slot, nextSel);
      return nextSel;
    });
  };

  const clearSlot = (slot: SlotKey) => {
    // Déclencher un petit état de chargement pour l'autre slot CPU↔MB lors du retrait
    if (slot === "cpu") flashRecompute(["motherboard"]);
    if (slot === "motherboard") flashRecompute(["cpu"]);
    setSelections((s) => ({ ...s, [slot]: undefined }));
  };
  const clearAll = () => setSelections({});

  const addBuildToCart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Bloquer si des incompatibilités existent dans la sélection actuelle
    const issues: { slot: SlotKey; reasons: string[] }[] = [];
    for (const s of SLOTS) {
      const sel = selections[s.key];
      if (!sel) continue;
      const constraints = deriveConstraints({ ...selections, [s.key]: undefined });
      const comp = checkCompatibility(s.key, sel, constraints);
      if (!comp.ok) issues.push({ slot: s.key, reasons: comp.reasons });
    }
    if (issues.length) {
      const msg = issues.map((i) => pickShortReason(i.reasons)).join(" | ");
      alert(`Configuration incompatible: ${msg}`);
      return;
    }

    const chosen = Object.values(selections).filter(Boolean) as ApiProduct[];
    if (!chosen.length) return;

    // Fly-to-cart from the button
    if (typeof window !== "undefined") {
      const el = e?.currentTarget as HTMLElement | undefined;
      const rect = (el ?? document.body).getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("cart:fly", {
          detail: { imageUrl: chosen[0]?.imageUrl, from: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } },
        })
      );
    }

    for (const p of chosen) {
      add({ productId: p.id, name: p.name, priceCents: p.priceCents, quantity: 1, imageUrl: p.imageUrl });
    }

    // Notify build added (toast)
    if (typeof window !== "undefined") {
      const totalCents = chosen.reduce((sum, p) => sum + p.priceCents, 0);
      window.dispatchEvent(new CustomEvent("cart:build-added", { detail: { count: chosen.length, totalCents } }));
    }

    // bump
    const btn = e?.currentTarget;
    if (btn) {
      btn.classList.remove("btn-bump");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (btn as HTMLElement).offsetWidth;
      btn.classList.add("btn-bump");
    }
  };

  const addBuildAndGoToCart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    addBuildToCart(e);
    if (typeof window !== "undefined") window.location.href = "/panier";
  };

  const filteredSlotList = (slotKey: SlotKey) => {
    let list = grouped.get(slotKey) || [];

    // Quick tiers by price quantiles
    const prices = list.map((p) => p.priceCents).sort((a, b) => a - b);
    const q1 = prices.length ? prices[Math.floor(prices.length / 3)] : 0;
    const q2 = prices.length ? prices[Math.floor((2 * prices.length) / 3)] : 0;

    const t = tier[slotKey] ?? "all";
    if (t !== "all") {
      list = list.filter((p) => {
        if (!prices.length) return true;
        if (t === "budget") return p.priceCents <= q1;
        if (t === "mid") return p.priceCents > q1 && p.priceCents <= q2;
        return p.priceCents > q2; // high
      });
    }

    const q = (search[slotKey] ?? "").toLowerCase().trim();
    if (q) {
      list = list.filter((p) => haystack(p).includes(q));
    }

    const s = sort[slotKey] ?? "relevance";
    if (s === "priceAsc") list = [...list].sort((a, b) => a.priceCents - b.priceCents);
    if (s === "priceDesc") list = [...list].sort((a, b) => b.priceCents - a.priceCents);

    return { list, q1, q2 };
  };

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Configurer votre PC</h1>
          <p className="mt-1 text-sm text-white/70">Choisissez vos composants, calculez le prix total et ajoutez la config au panier.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="chip" aria-live="polite">{selectedCount}/{SLOTS.length} sélectionnés</span>
            {selectedCount > 0 && <span className="text-xs text-white/50">Complétez les éléments restants pour une config équilibrée</span>}
          </div>
          <div className="mt-3 h-2 bg-white/10 rounded overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la configuration">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={clearAll} className="btn-ghost">Réinitialiser</button>
          <Link href="/catalogue" className="btn-ghost">Parcourir tout</Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: summary */}
        <aside className="md:col-span-1 section-contrast p-5 h-max md:sticky md:top-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300">Total configuration</span>
            <span className="font-semibold text-white">{fmt(total)}</span>
          </div>
          <ul className="space-y-2 text-sm">
            {SLOTS.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3">
                <span className="text-white/80">{s.label}</span>
                <span className="text-white/60 truncate max-w-[55%] text-right">
                  {selections[s.key]?.name ? selections[s.key]!.name : "—"}
                </span>
              </li>
            ))}
          </ul>
          <button onClick={addBuildAndGoToCart} disabled={!Object.values(selections).some(Boolean)} className="hidden md:block w-full mt-4 btn-cart rounded-md px-4 py-2 disabled:opacity-50">
            🛒 Voir mon panier
          </button>
        </aside>

        {/* Right: slots */}
        <section className="md:col-span-2 space-y-4">
          {SLOTS.map((slot) => {
            const selected = selections[slot.key];
            const isOpen = openSlot === slot.key;
            const { list, q1, q2 } = filteredSlotList(slot.key);
            const hasData = (grouped.get(slot.key) || []).length > 0;
            const constraintsForSlot = deriveConstraints({ ...selections, [slot.key]: undefined });
            const chips = constraintChips(constraintsForSlot);

            // Pré-filtrage strict par socket pour CPU↔MB quand une contrainte de socket existe
            let listToShow = list;
            const cSock = constraintsForSlot.socket;
            if (cSock) {
              if (slot.key === "motherboard") {
                listToShow = list.filter((p) => {
                  const s = mbSpec(p).socket;
                  return !!s && s === cSock;
                });
              } else if (slot.key === "cpu") {
                listToShow = list.filter((p) => {
                  const s = cpuSpec(p).socket;
                  return !!s && s === cSock;
                });
              }
            }

            return (
              <div key={slot.key} className="section-contrast overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-white/[0.03] flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-white/60">{slot.label}</div>
                    <div className="font-semibold truncate flex items-center gap-2" title={selected ? selected.name : undefined}>
                      {selected ? (
                        <>
                          {selected.imageUrl && (
                            <span className="relative inline-block h-6 w-6 overflow-hidden rounded">
                              <Image src={selected.imageUrl} alt="" fill className="object-cover" />
                            </span>
                          )}
                          <span className="truncate break-words">{selected.name}</span>
                          <span className="text-[var(--accent)] text-sm font-medium">{fmt(selected.priceCents)}</span>
                        </>
                      ) : (
                        <span className="text-white/60">Aucun composant sélectionné</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!!selected && (
                      <button onClick={() => clearSlot(slot.key)} className="btn-ghost">Retirer</button>
                    )}
                    <button aria-expanded={isOpen} onClick={() => setOpenSlot(isOpen ? null : slot.key)} className="btn-primary">
                      {isOpen ? "Fermer" : "Choisir"}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-white/10 p-4">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className={`px-3 py-1 rounded text-xs border ${((tier[slot.key] ?? "all") === "all") ? "bg-white/10 border-white/20" : "border-white/10"}`}
                          onClick={() => setTier((t) => ({ ...t, [slot.key]: "all" }))}
                        >
                          Tous
                        </button>
                        {hasData && (
                          <>
                            <button
                              className={`px-3 py-1 rounded text-xs border ${((tier[slot.key] ?? "all") === "budget") ? "bg-white/10 border-white/20" : "border-white/10"}`}
                              onClick={() => setTier((t) => ({ ...t, [slot.key]: "budget" }))}
                              title={`⩽ ${fmt(q1)}`}
                            >
                              Budget
                            </button>
                            <button
                              className={`px-3 py-1 rounded text-xs border ${((tier[slot.key] ?? "all") === "mid") ? "bg-white/10 border-white/20" : "border-white/10"}`}
                              onClick={() => setTier((t) => ({ ...t, [slot.key]: "mid" }))}
                              title={`${fmt(q1)} – ${fmt(q2)}`}
                            >
                              Milieu
                            </button>
                            <button
                              className={`px-3 py-1 rounded text-xs border ${((tier[slot.key] ?? "all") === "high") ? "bg-white/10 border-white/20" : "border-white/10"}`}
                              onClick={() => setTier((t) => ({ ...t, [slot.key]: "high" }))}
                              title={`⩾ ${fmt(q2)}`}
                            >
                              Haut de gamme
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          value={search[slot.key] ?? ""}
                          onChange={(e) => setSearch((s) => ({ ...s, [slot.key]: e.target.value }))}
                          placeholder="Rechercher dans cette catégorie"
                          className="w-full sm:w-64 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm outline-none focus:border-[var(--accent)]"
                        />
                        <select
                          value={sort[slot.key] ?? "relevance"}
                          onChange={(e) => setSort((s) => ({ ...s, [slot.key]: e.target.value as any }))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded text-sm outline-none focus:border-[var(--accent)]"
                          title="Trier"
                        >
                          <option value="relevance">Pertinence</option>
                          <option value="priceAsc">Prix: croissant</option>
                          <option value="priceDesc">Prix: décroissant</option>
                        </select>
                      </div>
                    </div>

                    {chips.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {chips.map((c, i) => (
                          <span key={i} className="chip" title="Contrainte active">{c}</span>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    {(loading || recomputing[slot.key]) ? (
                      <div>
                        <div className="text-sm text-white/60 mb-2" role="status" aria-live="polite">
                          {loading ? "Chargement…" : "Mise à jour…"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="card overflow-hidden animate-pulse">
                              <div className="h-28 w-full bg-white/5" />
                              <div className="p-3 space-y-2">
                                <div className="h-4 bg-white/10 rounded w-3/4" />
                                <div className="h-4 bg-white/10 rounded w-1/3" />
                                <div className="h-3 bg-white/10 rounded w-1/2 mt-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {!listToShow.length && (
                          <div className="text-sm text-white/70">Aucun produit pour cette catégorie pour le moment.</div>
                        )}
                        {listToShow.length > 0 && (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
                            {listToShow
                              .map((p) => ({ p, comp: checkCompatibility(slot.key, p, constraintsForSlot) }))
                              // Filtrer TOUTES les catégories: n'afficher que les compatibles
                              .filter((x) => x.comp.ok)
                              .map(({ p, comp }) => {
                                const isSelected = selected?.id === p.id;
                                const dim = comp.ok ? "" : "opacity-50 grayscale pointer-events-none";
                                return (
                                  <div key={p.id} className={`card hover-card overflow-hidden transition-all w-full ${isSelected ? "shadow-neon" : ""} ${dim}`} title={comp.ok ? undefined : comp.reasons.join(", ")}> 
                                    <div className="relative h-28 w-full">
                                      {p.imageUrl ? (
                                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                                      ) : (
                                        <div className="h-full w-full bg-white/5" />
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/15 to-transparent" />
                                      {isSelected && (
                                        <div className="absolute top-2 right-2 chip">✓ Sélectionné</div>
                                      )}
                                    </div>
                                    <div className="p-3">
                                      <div className="font-medium leading-tight line-clamp-2" title={p.name}>{p.name}</div>
                                      <div className="text-[var(--accent)] font-semibold mt-1">{fmt(p.priceCents)}</div>
                                      {p.highlights?.length ? (
                                        <ul className="mt-2 space-y-1 text-xs text-white/80">
                                          {p.highlights.slice(0, 3).map((h, i) => (
                                            <li key={i} className="flex gap-1"><span className="opacity-60">•</span><span>{h}</span></li>
                                          ))}
                                        </ul>
                                      ) : null}
                                      <div className="mt-3 flex gap-2">
                                        <Link href={`/produit/${p.slug}`} className="btn-ghost text-xs">Voir</Link>
                                        <button onClick={() => pick(slot.key, p)} className="btn-primary text-xs">Choisir</button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Stepper navigation */}
                    <div className="mt-6 flex items-center justify-between">
                      <button onClick={() => goToPrevSlot(slot.key)} className="btn-ghost">Précédent</button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setOpenSlot(null)} className="btn-ghost">Fermer</button>
                        <button onClick={() => goToNextUnselected(slot.key)} className="btn-primary">Suivant</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="container flex items-center justify-between p-3">
          <div>
            <div className="text-xs text-white/60">Total</div>
            <div className="font-semibold">{fmt(total)}</div>
          </div>
          <button onClick={addBuildAndGoToCart} disabled={!Object.values(selections).some(Boolean)} className="btn-cart rounded-md px-4 py-2 disabled:opacity-50">
            Voir mon panier
          </button>
        </div>
      </div>
    </main>
  );
}
