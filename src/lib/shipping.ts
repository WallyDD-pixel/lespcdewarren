export type ShippingAddress = {
  country: string;
  zip: string;
  city?: string;
};

export type ShippingCartItem = { productId: number; quantity: number; variantId?: number | null };

export type ShippingMethod = {
  id: string;
  label: string;
  carrier: string;
  etaDays: number; // approximation (p.ex. 7 pour "6 à 9 jours")
  priceCents: number;
};

// --- Helpers: normalisation pays vers ISO2 ---
function norm(str?: string): string {
  return (str || "").trim().toUpperCase();
}

const nameToIso: Record<string, string> = {
  FRANCE: "FR",
  FR: "FR",
  BELGIQUE: "BE",
  BELGIUM: "BE",
  BE: "BE",
  SUISSE: "CH",
  SWITZERLAND: "CH",
  CH: "CH",
  LUXEMBOURG: "LU",
  LU: "LU",
  ITALIE: "IT",
  ITALY: "IT",
  IT: "IT",
  ESPAGNE: "ES",
  SPAIN: "ES",
  ES: "ES",
  ALLEMAGNE: "DE",
  GERMANY: "DE",
  DE: "DE",
  "PAYS-BAS": "NL",
  NETHERLANDS: "NL",
  HOLLANDE: "NL",
  NL: "NL",
  PORTUGAL: "PT",
  PT: "PT",
  AUTRICHE: "AT",
  AUSTRIA: "AT",
  AT: "AT",
  IRLANDE: "IE",
  IRELAND: "IE",
  IE: "IE",
  DANEMARK: "DK",
  DENMARK: "DK",
  DK: "DK",
  NORVEGE: "NO",
  NORWAY: "NO",
  NO: "NO",
  SUEDE: "SE",
  SWEDEN: "SE",
  SE: "SE",
  FINLANDE: "FI",
  FINLAND: "FI",
  FI: "FI",
  ANDORRE: "AD",
  AD: "AD",
  MONACO: "MC",
  MC: "MC",
  CANADA: "CA",
  CA: "CA",
  GUADELOUPE: "GP",
  GP: "GP",
  MARTINIQUE: "MQ",
  MQ: "MQ",
  GUYANE: "GF",
  "GUYANE FRANCAISE": "GF",
  GF: "GF",
  REUNION: "RE",
  RÉUNION: "RE",
  RE: "RE",
  MAYOTTE: "YT",
  YT: "YT",
  "POLYNESIE FRANCAISE": "PF",
  PF: "PF",
  "NOUVELLE-CALEDONIE": "NC",
  NC: "NC",
  "SAINT-PIERRE-ET-MIQUELON": "PM",
  PM: "PM",
  "SAINT-BARTHELEMY": "BL",
  BL: "BL",
  "SAINT-MARTIN": "MF",
  MF: "MF",
  "WALLIS-ET-FUTUNA": "WF",
  WF: "WF",
};

const AFRICA_ISO = new Set<string>([
  "DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CG","CD","CI","DJ","EG","GQ","ER","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","SZ","TZ","TG","TN","UG","ZM","ZW",
]);

const EUROPE_ISO = new Set<string>([
  "BE","CH","LU","IT","DE","ES","PT","NL","AT","IE","DK","SE","NO","FI","AD","MC",
]);

const FR_OVERSEAS_ISO = new Set<string>([
  "GP","MQ","GF","RE","YT","PF","NC","PM","BL","MF","WF",
]);

export function toISO2(country?: string): string | undefined {
  const s = norm(country);
  if (!s) return undefined;
  if (nameToIso[s]) return nameToIso[s];
  if (s.length === 2) return s;
  if (s.includes("RDC")) return "CD";
  if (s.includes("CIV") || s.includes("COTE D'IVOIRE") || s.includes("CÔTE D'IVOIRE")) return "CI";
  if (s.includes("SEN")) return "SN";
  if (s.includes("MAL")) return "ML";
  return undefined;
}

const labelByCode: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  LU: "Luxembourg",
  IT: "Italie",
  DE: "Allemagne",
  ES: "Espagne",
  PT: "Portugal",
  NL: "Pays‑Bas",
  AT: "Autriche",
  IE: "Irlande",
  DK: "Danemark",
  SE: "Suède",
  NO: "Norvège",
  FI: "Finlande",
  AD: "Andorre",
  MC: "Monaco",
  CA: "Canada",
  GP: "Guadeloupe",
  MQ: "Martinique",
  GF: "Guyane",
  RE: "La Réunion",
  YT: "Mayotte",
  PF: "Polynésie française",
  NC: "Nouvelle‑Calédonie",
  PM: "Saint‑Pierre‑et‑Miquelon",
  BL: "Saint‑Barthélemy",
  MF: "Saint‑Martin",
  WF: "Wallis‑et‑Futuna",
  // Africa (subset with friendly names; others fallback to code)
  CD: "RD Congo",
  CI: "Côte d’Ivoire",
  SN: "Sénégal",
  ML: "Mali",
  MA: "Maroc",
  DZ: "Algérie",
  TN: "Tunisie",
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  CM: "Cameroun",
  ZA: "Afrique du Sud",
};

export function getSupportedCountries(): Array<{ code: string; label: string; region: string }> {
  const list: Array<{ code: string; region: string }> = [];
  // France
  list.push({ code: "FR", region: "France" });
  // Europe
  EUROPE_ISO.forEach((c) => list.push({ code: c, region: "Europe" }));
  // Outre‑mer
  FR_OVERSEAS_ISO.forEach((c) => list.push({ code: c, region: "Outre‑mer" }));
  // Afrique (liste large)
  AFRICA_ISO.forEach((c) => list.push({ code: c, region: "Afrique" }));
  // Canada
  list.push({ code: "CA", region: "Amérique du Nord" });

  // Unique + tri
  const seen = new Set<string>();
  const unique = list.filter((x) => (seen.has(x.code) ? false : (seen.add(x.code), true)));
  const withLabels = unique.map((x) => ({ code: x.code, region: x.region, label: labelByCode[x.code] || x.code }));
  return withLabels.sort((a, b) => (a.region === b.region ? a.label.localeCompare(b.label) : a.region.localeCompare(b.region)));
}

// --- Tarifs par région fournis ---
const REGION_TARIFFS: Array<{
  id: string;
  label: string;
  etaDays: number;
  priceCents: number;
  matcher: (iso?: string) => boolean;
}> = [
  {
    id: "fr-colissimo",
    label: "Livraison Colissimo France (6 à 9 jours)",
    etaDays: 7,
    priceCents: 3000,
    matcher: (iso) => iso === "FR",
  },
  // Retrait en main propre (local)
  {
    id: "pickup-local",
    label: "Retrait en main propre (61 rue de Paris, 95120)",
    etaDays: 0,
    priceCents: 0,
    matcher: (iso) => iso === "FR",
  },
  {
    id: "eu-standard",
    label: "Europe (Belgique, Suisse, Luxembourg, Italie, etc.)",
    etaDays: 9,
    priceCents: 7000,
    matcher: (iso) => !!iso && EUROPE_ISO.has(iso),
  },
  {
    id: "fr-outremer",
    label: "France d'outre‑mer",
    etaDays: 12,
    priceCents: 11500,
    matcher: (iso) => !!iso && FR_OVERSEAS_ISO.has(iso),
  },
  {
    id: "africa-standard",
    label: "Afrique (RDC, CIV, Sénégal, Mali, etc.)",
    etaDays: 14,
    priceCents: 15000,
    matcher: (iso) => !!iso && AFRICA_ISO.has(iso),
  },
  {
    id: "ca-standard",
    label: "CANADA (10 à 12 jours)",
    etaDays: 11,
    priceCents: 20000,
    matcher: (iso) => iso === "CA",
  },
];

export function calculateItemTotalCents(items: Array<{ priceCents?: number; quantity: number }>): number {
  return items.reduce((s, i) => s + Math.max(0, Number(i.priceCents || 0)) * Math.max(1, Number(i.quantity || 1)), 0);
}

export function getShippingRates(address: ShippingAddress, _cartTotalCents: number): ShippingMethod[] {
  const iso = toISO2(address?.country);
  const region = REGION_TARIFFS.find((r) => r.matcher(iso));
  if (region) {
    return [
      { id: region.id, label: region.label, carrier: "Standard", etaDays: region.etaDays, priceCents: region.priceCents },
    ];
  }
  // Fallback: si non reconnu, appliquer tarif international par défaut
  return [
    { id: "intl-default", label: "International Standard", carrier: "Postal", etaDays: 12, priceCents: 20000 },
  ];
}

export function pickShippingRate(address: ShippingAddress, cartTotalCents: number, methodId?: string | null): ShippingMethod {
  const rates = getShippingRates(address, cartTotalCents);
  if (!rates.length) return { id: "none", label: "Aucun transporteur disponible", carrier: "N/A", etaDays: 0, priceCents: 0 };
  const found = rates.find((r) => r.id === methodId);
  return found || rates[0];
}
