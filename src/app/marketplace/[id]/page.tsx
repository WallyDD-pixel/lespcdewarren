"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, ChevronLeft, ChevronRight, Cpu, Gpu, MemoryStick, HardDrive, Monitor, Laptop, Keyboard, Mouse, Battery, Wifi, Bluetooth, Plug, Ruler, Palette, ShieldCheck, Tag, Server, Settings, Fan, Loader2 } from "lucide-react";

// Helper
function toTitleCase(s?: string | null) {
  if (!s) return "";
  return s
    .split(" ")
    .map((word) => word.split("-").map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("-"))
    .join(" ");
}
function capitalizeFirst(s?: string | null) {
  const str = (s ?? "").trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
// Nouveau: formatage de la date de mise en ligne (heures si < 24h, sinon en jours)
function formatPostedAge(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) diffMs = 0;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    const h = Math.max(1, diffHours);
    return `il y a ${h} ${h > 1 ? "heures" : "heure"}`;
  }
  const days = Math.max(1, Math.floor(diffHours / 24));
  return `il y a ${days} ${days > 1 ? "jours" : "jour"}`;
}

// Helpers coloration des badges
function norm(x: string) { return (x || "").toLowerCase(); }
function parseNumberFrom(text: string) {
  const m = (text || "").match(/(\d+[\.,]?\d*)/);
  return m ? parseFloat(m[1].replace(",", ".")) : NaN;
}
function tierForCPU(text: string) {
  const t = norm(text);
  if (/celeron|pentium|athlon|i3\b|ryzen\s*3|r3\b/.test(t)) return "low";
  if (/i5\b|ryzen\s*5|r5\b/.test(t)) return "mid";
  if (/i7\b|ryzen\s*7|r7\b/.test(t)) return "high";
  if (/i9\b|ryzen\s*9|r9\b|threadripper/.test(t)) return "ultra";
  return "neutral";
}
function tierForGPU(text: string) {
  const t = norm(text);
  if (/igpu|integr(e|é)e|uhd|iris|vega\s*\d|raden/i.test(text)) return "low";
  if (/gtx\s*10|gtx\s*16|rx\s*(5|6)5?0/.test(t)) return "mid";
  if (/rtx\s*20|rx\s*5(7|8)00|rx\s*6600|rx\s*6700/.test(t)) return "high";
  if (/rtx\s*30|rtx\s*40|rx\s*6800|rx\s*6900|rx\s*7800|rx\s*7900/.test(t)) return "ultra";
  return "neutral";
}
function tierForRAM(text: string) {
  const gb = parseNumberFrom(text);
  if (gb >= 32) return "high";
  if (gb >= 16) return "mid";
  if (gb >= 8) return "low";
  return "neutral";
}
function tierForStorage(text: string) {
  const t = norm(text);
  const gb = parseNumberFrom(text);
  const isSSD = /ssd|nvme|m\.2/.test(t);
  if (isSSD && gb >= 1000) return "ultra";
  if (isSSD && gb >= 512) return "high";
  if (isSSD || gb >= 1000) return "mid";
  return "low";
}
function classesForTier(tier: string) {
  switch (tier) {
    case "low": return "bg-amber-500/15 border-amber-400/30 text-amber-200";
    case "mid": return "bg-sky-500/15 border-sky-400/30 text-sky-200";
    case "high": return "bg-violet-500/15 border-violet-400/30 text-violet-200";
    case "ultra": return "bg-emerald-500/15 border-emerald-400/30 text-emerald-200";
    default: return "bg-white/5 border-white/10 text-white/90";
  }
}
function classesForSpec(key: "cpu"|"gpu"|"ram"|"storage", text: string) {
  let tier = "neutral";
  if (key === "cpu") tier = tierForCPU(text);
  else if (key === "gpu") tier = tierForGPU(text);
  else if (key === "ram") tier = tierForRAM(text);
  else if (key === "storage") tier = tierForStorage(text);
  return classesForTier(tier);
}

// Détermination du type par clé pour choisir une icône
function getKindForKey(rawKey: string):
  | "cpu" | "gpu" | "ram" | "storage" | "motherboard" | "psu" | "case" | "cooling"
  | "screen" | "laptop" | "keyboard" | "mouse" | "battery" | "wifi" | "bluetooth"
  | "network" | "ports" | "os" | "color" | "size" | "brand" | "model" | "warranty" | "other" {
  const k = norm(rawKey);
  if (/(cpu|processor|processeur)/.test(k)) return "cpu";
  if (/(gpu|graphics|carte\s*graphique|vid[ée]o)/.test(k)) return "gpu";
  if (/(ram|memoire|memory)/.test(k)) return "ram";
  if (/(stockage|storage|disque|ssd|hdd|nvme|m\.2)/.test(k)) return "storage";
  if (/(motherboard|mobo|carte\s*m[èe]re|chipset)/.test(k)) return "motherboard";
  if (/(alimentation|psu|power)/.test(k)) return "psu";
  if (/(bo[iî]tier|case|chassis)/.test(k)) return "case";
  if (/(cooling|cooler|ventilateur|fan|watercooling)/.test(k)) return "cooling";
  if (/(ecran|screen|monitor|affichage|display)/.test(k)) return "screen";
  if (/(laptop|notebook|portable)/.test(k)) return "laptop";
  if (/(clavier|keyboard)/.test(k)) return "keyboard";
  if (/(souris|mouse)/.test(k)) return "mouse";
  if (/(batterie|battery)/.test(k)) return "battery";
  if (/(wifi|wi\-fi)/.test(k)) return "wifi";
  if (/bluetooth/.test(k)) return "bluetooth";
  if (/(ethernet|r[ée]seau|lan)/.test(k)) return "network";
  if (/(usb|hdmi|displayport|thunderbolt|port\b|ports\b)/.test(k)) return "ports";
  if (/(os|syst[èe]me|windows|linux|macos)/.test(k)) return "os";
  if (/(couleur|color)/.test(k)) return "color";
  if (/(taille|dimension|dimensions|size)/.test(k)) return "size";
  if (/(marque|brand)/.test(k)) return "brand";
  if (/(mod[èe]le|model)/.test(k)) return "model";
  if (/(garantie|warranty)/.test(k)) return "warranty";
  return "other";
}
function iconForKind(kind: ReturnType<typeof getKindForKey>) {
  switch (kind) {
    case "cpu": return <Cpu className="h-4 w-4" />;
    case "gpu": return <Gpu className="h-4 w-4" />;
    case "ram": return <MemoryStick className="h-4 w-4" />;
    case "storage": return <HardDrive className="h-4 w-4" />;
    case "motherboard": return <Server className="h-4 w-4" />;
    case "psu": return <Plug className="h-4 w-4" />;
    case "case": return <Settings className="h-4 w-4" />;
    case "cooling": return <Fan className="h-4 w-4" />;
    case "screen": return <Monitor className="h-4 w-4" />;
    case "laptop": return <Laptop className="h-4 w-4" />;
    case "keyboard": return <Keyboard className="h-4 w-4" />;
    case "mouse": return <Mouse className="h-4 w-4" />;
    case "battery": return <Battery className="h-4 w-4" />;
    case "wifi": return <Wifi className="h-4 w-4" />;
    case "bluetooth": return <Bluetooth className="h-4 w-4" />;
    case "network": return <Server className="h-4 w-4" />;
    case "ports": return <Plug className="h-4 w-4" />;
    case "os": return <Tag className="h-4 w-4" />;
    case "color": return <Palette className="h-4 w-4" />;
    case "size": return <Ruler className="h-4 w-4" />;
    case "brand": return <Tag className="h-4 w-4" />;
    case "model": return <Tag className="h-4 w-4" />;
    case "warranty": return <ShieldCheck className="h-4 w-4" />;
    default: return <Tag className="h-4 w-4" />;
  }
}

// Mapping FR pour le statut d'annonce et styles de badge
const LISTING_STATUS_FR: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente",
  PUBLISHED: "Publiée",
  RESERVED: "Réservée",
  SOLD: "Vendue",
  ARCHIVED: "Archivée",
};
const BADGE_CLS: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-600",
  RESERVED: "bg-amber-600",
  SOLD: "bg-red-600",
  ARCHIVED: "bg-gray-600",
};
const listingStatusFr = (s?: string) => (s ? LISTING_STATUS_FR[s] ?? s : "");
const listingBadgeCls = (s?: string) => (s ? `${BADGE_CLS[s] ?? "bg-gray-600"} text-white` : "bg-gray-600 text-white");

// Helpers pour récupérer une valeur dans specs (insensible à la casse)
function pickSpecValue(obj: Record<string, any>, keys: string[]) {
  const entries = Object.entries(obj || {});
  for (const key of keys) {
    const found = entries.find(([k]) => norm(k) === norm(key));
    if (found && String(found[1]).trim() !== "") return String(found[1]);
  }
  return undefined;
}
function isNoteKey(k: string) {
  const t = norm(k);
  return t === "notes" || t === "note" || t === "remarque" || t === "remarques" || t === "commentaire" || t === "commentaires";
}

export default function ListingDetailPage() {
  const { id } = useParams() as { id: string };
  const r = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [viewerId, setViewerId] = useState<number | null>(null);
  // const [showPay, setShowPay] = useState(false);
  // Naviguer vers le profil vendeur (placeholder: page liste avec filtre seller)
  const goToSellerProfile = () => {
    const sellerId = (data as any)?.seller?.id;
    if (sellerId) r.push(`/marketplace/seller/${sellerId}`);
  };

  // Galerie
  const images: string[] = useMemo(() => (
    Array.isArray(data?.images) ? data.images.map((im: any) => im?.url).filter(Boolean) : []
  ), [data]);
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [id]);
  const prev = () => setIdx((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
  const next = () => setIdx((i) => (images.length ? (i + 1) % images.length : 0));
  // Ajout: suivi du chargement des images (galerie + miniatures)
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const markLoaded = (src?: string) => {
    if (!src) return;
    setImgLoaded((m) => (m[src] ? m : { ...m, [src]: true }));
  };
  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);
  useEffect(() => { setLightboxOpen(false); }, [id]);
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, prev, next]);

  // Charger l'annonce
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/listings/${id}`);
        const json = await res.json();
        if (!alive) return;
        setData(json.listing);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Charger l'utilisateur courant pour savoir si c'est son annonce
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/account", { cache: 'no-store' });
        if (!alive) return;
        if (meRes.ok) {
          const me = await meRes.json();
          setViewerId(me?.user?.id ?? null);
        } else {
          setViewerId(null);
        }
      } catch {
        if (alive) setViewerId(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function contactSeller() {
    if (!data) return;
    try {
      setContacting(true);
      // Récupérer l'utilisateur pour le buyerId
      const meRes = await fetch("/api/account");
      if (meRes.status === 401) { r.push("/login?next=" + encodeURIComponent(`/marketplace/${id}`)); return; }
      const me = await meRes.json();
      const buyerId = me?.user?.id;
      if (!buyerId) throw new Error("no-user");
      const res = await fetch("/api/marketplace/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: data.id, buyerId }),
      });
      const json = await res.json();
      if (json?.ok && json.conversationId) {
        r.push(`/messages/${json.conversationId}`);
      }
    } finally {
      setContacting(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video rounded bg-white/5 animate-pulse" />
            <div className="h-6 w-2/3 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
            <div className="h-40 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-white/5 rounded animate-pulse" />
            <div className="h-32 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="container py-6">Introuvable</div>;

  const price = (data.priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  const locationLine = [data.zip, data.city, (data as any).country ? String((data as any).country).toUpperCase() : undefined].filter(Boolean).join(" ");
  // Nouveau: texte "Mise en ligne ..."
  const createdAtStr = (data as any)?.createdAt || (data as any)?.publishedAt || (data as any)?.created_at || (data as any)?.postedAt;
  const postedText = formatPostedAge(createdAtStr);
  // Courant: source de l'image affichée
  const currentSrc = images[idx];
  // Achat possible / état vendu
  const canBuy = data?.status === 'PUBLISHED';
  const isSold = data?.status === 'SOLD';
  const isOwner = viewerId != null && data?.seller?.id === viewerId;
  // Déterminer le libellé CTA selon le statut
  const ctaLabel = canBuy
    ? 'Acheter'
    : (data?.status === 'SOLD'
        ? 'Vendu'
        : (data?.status === 'PENDING_REVIEW'
            ? 'En attente'
            : (data?.status === 'RESERVED' ? 'Réservée' : 'Indisponible')));

  // Préparer les puces specs avec icônes
  const s = (data?.specs || {}) as Record<string, string>;
  const specChips = Object.entries(s)
    .filter(([k, v]) => v != null && String(v).trim() !== "" && !isNoteKey(k))
    .map(([k, v]) => {
      const kind = getKindForKey(k);
      const colorCls = (kind === "cpu" || kind === "gpu" || kind === "ram" || kind === "storage")
        ? classesForSpec(kind as any, String(v))
        : "bg-white/5 border-white/10 text-white/90";
      return {
        key: k,
        icon: iconForKind(kind),
        label: toTitleCase(k),
        value: toTitleCase(String(v)),
        cls: colorCls,
      };
    });

  // Choisir le contenu des Notes: chercher d'abord dans specs (notes/note/remarque/commentaire), sinon data.notes, sinon description
  const notesFromSpecs = pickSpecValue(s, ["notes", "note", "remarque", "remarques", "commentaire", "commentaires"]);
  const notesContent = notesFromSpecs ?? (data as any).notes ?? data.description ?? "";

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche: galerie + infos */}
        <div className="lg:col-span-2">
          {/* Galerie */}
          <div className="card overflow-hidden">
            <div className="relative aspect-video bg-black/5">
              {currentSrc ? (
                <>
                  {!imgLoaded[currentSrc] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                      <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentSrc}
                    alt={data.title}
                    onLoad={() => markLoaded(currentSrc)}
                    onError={() => markLoaded(currentSrc)}
                    loading="eager"
                    decoding="async"
                    onClick={() => imgLoaded[currentSrc] && openLightbox()}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded[currentSrc] ? 'opacity-100 cursor-zoom-in' : 'opacity-0'} `}
                  />
                </>
              ) : null}
              {data?.status && data.status !== 'PUBLISHED' && (
                <span className={`absolute top-2 left-2 rounded text-xs font-semibold px-2 py-1 ${listingBadgeCls(data.status)}`}>
                  {listingStatusFr(data.status)}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 btn-ghost rounded-full p-2" aria-label="Précédente">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost rounded-full p-2" aria-label="Suivante">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  {!imgLoaded[src] && (
                    <div className="absolute inset-0 rounded border border-white/10 bg-white/5 animate-pulse" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt="miniature"
                    onClick={() => setIdx(i)}
                    onLoad={() => markLoaded(src)}
                    onError={() => markLoaded(src)}
                    loading="lazy"
                    decoding="async"
                    className={`h-16 w-24 object-cover rounded cursor-pointer border ${i===idx ? 'border-[var(--accent)]' : 'border-white/10'} hover:opacity-90 transition-opacity duration-300 ${imgLoaded[src] ? 'opacity-100' : 'opacity-0'}`}
                  />
                </div>
              ))}
            </div>
          )}
          {/* Titre + localisation */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{capitalizeFirst(data.title)}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="h-4 w-4" />
              <span>{locationLine}</span>
              {postedText && (
                <>
                  <span className="opacity-50">•</span>
                  <span>Mise en ligne {postedText}</span>
                </>
              )}
            </div>
          </div>

          {/* Détails / Description */}
          <div className="mt-4 card p-4">
            {specChips.length ? (
              <>
                <h2 className="font-semibold mb-2">Composants</h2>
                <ul className="mb-4 flex flex-wrap gap-2">
                  {specChips.map((c) => (
                    <li key={c.key} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs border ${c.cls}`} title={`${c.label}: ${c.value}`}>
                      <span className="text-white/85">{c.icon}</span>
                      <span className="font-medium">{c.label}:</span>
                      <span className="truncate max-w-[18rem]">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-gray-200">{notesContent}</p>
          </div>
        </div>

        {/* Colonne droite: aside sticky */}
        <aside className="space-y-4 lg:sticky lg:top-6 h-fit">
          <div className="card p-4">
            <div className="text-2xl font-bold">{price} €</div>
            <div className="mt-2 text-sm text-gray-400">{data.condition || ""}</div>
            <div className="mt-4 flex flex-col gap-2">
              {isOwner ? (
                <div className="w-full rounded border border-white/10 bg-white/5 text-sm text-gray-200 px-3 py-2 text-center">
                  Cette annonce est la vôtre
                </div>
              ) : (
                <button onClick={contactSeller} disabled={contacting} className="btn-primary w-full">
                  {contacting ? "Ouverture…" : "Contacter le vendeur"}
                </button>
              )}
              <button
                onClick={() => r.push(`/checkout?listingId=${data.id}`)}
                className="btn-ghost w-full"
                aria-label={ctaLabel}
                title={canBuy ? "Définir l’adresse et payer" : ctaLabel}
                disabled={!canBuy}
              >
                {ctaLabel}
              </button>
            </div>
            {/* Suppression du flux PayPal inline pour utiliser la page Checkout */}
          </div>

          <div className="card p-4">
            <h3 className="font-semibold">Vendeur</h3>
            <div className="mt-2 text-sm">{data?.seller?.name || "Vendeur"}</div>
            <div className="mt-1 text-xs text-gray-500">Réponse moyenne: —</div>
            <button onClick={goToSellerProfile} className="mt-3 btn-ghost w-full">Voir le profil du vendeur</button>
          </div>

          <div className="card p-4 text-xs text-gray-400">
            <div className="font-semibold text-gray-200 mb-1">Conseils de sécurité</div>
            • Gardez échanges et paiements sur la plateforme; hors plateforme = pas de protection.
            <br />• Ne cliquez pas sur des liens reçus par message (phishing, faux sites de paiement).
            <br />• N'envoyez jamais d'acompte, de codes 2FA ou de pièces d'identité par chat.
            <br />• Méfiez-vous des offres trop alléchantes, de l'urgence imposée et des profils récents.
            <br />• Refusez les « transporteurs » imposés et les livraisons hors plateforme.
            <br />• Arnaque au surpaiement: ne remboursez jamais un « trop-perçu » prétendu.
            <br />• Rendez-vous: lieu public, fréquenté et éclairé; venez accompagné; prévenez un proche.
            <br />• Vérifiez le paiement sur la plateforme; n'accordez aucune valeur aux captures d'écran.
            <br />• Espèces: privilégiez une banque/commerçant pour compter; attention aux faux billets.
            <br />• Si le rendez-vous semble risqué (lieu isolé, tard le soir), annulez. En cas d'urgence, contactez les autorités.
          </div>
        </aside>
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Aperçu des images">
          <button onClick={closeLightbox} className="absolute top-4 right-4 btn-ghost">✕</button>
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 btn-ghost rounded-full p-2" aria-label="Précédente">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSrc} alt={data.title} className="max-w-[90vw] max-h-[80vh] object-contain" />
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto justify-center">
                {images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="miniature"
                    onClick={() => setIdx(i)}
                    className={`h-14 w-20 object-cover rounded cursor-pointer border ${i===idx ? 'border-[var(--accent)]' : 'border-white/10'} hover:opacity-90`}
                  />
                ))}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 btn-ghost rounded-full p-2" aria-label="Suivante">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
