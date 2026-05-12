"use client";
import useSWR from "swr";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, Cpu, Gpu, MemoryStick, HardDrive, Server, Plug, Settings, Fan, Monitor, Laptop, Keyboard, Mouse, Battery, Wifi, Bluetooth, Tag, Palette, Ruler, ShieldCheck, ArrowLeft, Star, EllipsisVertical, MapPin, Calendar, Check } from "lucide-react";

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());

// Helpers
function formatPublished(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("fr-FR");
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Publiée le ${date} à ${time}`;
}
function ageFrom(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const absMs = Math.abs(diffMs);

  // < ~45s => "à l'instant" (tolérance aux décalages mineurs d'horloge)
  if (absMs < 45 * 1000) return "à l'instant";

  const minutes = Math.floor(absMs / (60 * 1000));
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} ${days > 1 ? 'jours' : 'jour'}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} ${weeks > 1 ? 'semaines' : 'semaine'}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `il y a ${years} ${years > 1 ? 'ans' : 'an'}`;
}
function truncate(s?: string, len = 220) {
  const t = (s || "").trim();
  return t.length > len ? t.slice(0, len - 1) + "…" : t;
}
function pickSpecValue(obj: Record<string, any> | undefined, keys: string[]) {
  const o = obj || {}; const entries = Object.entries(o);
  for (const k of keys) { const f = entries.find(([kk]) => kk.toLowerCase() === k.toLowerCase()); if (f && String(f[1]).trim()) return String(f[1]); }
  return undefined;
}

// Ajouts pour afficher les composants (specs) et styliser comme la page produit
function toTitleCase(s?: string | null) {
  if (!s) return "";
  return s
    .split(" ")
    .map((word) => word.split("-").map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("-"))
    .join(" ");
}
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
function isNoteKey(k: string) {
  const t = norm(k);
  return t === "notes" || t === "note" || t === "remarque" || t === "remarques" || t === "commentaire" || t === "commentaires";
}

export default function ConversationPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<{ conversation: any }>(`/api/marketplace/conversations/${id}`, fetcher, { refreshInterval: 5000 });
  const { data: listRes, isLoading: listLoading, mutate: mutateList } = useSWR<{ conversations: any[] }>(`/api/marketplace/messages`, fetcher);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Suppression: pièces jointes désactivées
  // const [attachments, setAttachments] = useState<{ file: File; url: string; type: string }[]>([]);
  // const fileInputRef = useRef<HTMLInputElement | null>(null);

  const c = data?.conversation;
  const convs = listRes?.conversations || [];

  // Auto-scroll vers le bas à chaque nouveau message (déplacé avant tout return pour garder l'ordre des Hooks)
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [c?.messages?.length]);

  // Listing complet pour le résumé (prix, description, specs...)
  const { data: listingRes } = useSWR(c?.listing?.id ? `/api/marketplace/listings/${c.listing.id}` : null, fetcher);
  const listing = listingRes?.listing;
  const price = typeof listing?.priceCents === "number" ? (listing.priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0 }) + " €" : undefined;
  const published = formatPublished(listing?.createdAt || listing?.publishedAt || listing?.created_at);
  const sellerName = c?.seller?.name || listing?.seller?.name || "Vendeur";
  const sellerInitial = (sellerName || "V").charAt(0).toUpperCase();
  const locationLine = [listing?.city, listing?.zip].filter(Boolean).join(" ");
  const specs = (listing?.specs || {}) as Record<string, string>;
  const critEtat = listing?.condition || pickSpecValue(specs, ["etat", "état", "state", "condition"]); 
  const critType = pickSpecValue(specs, ["type"]);
  const critUse = pickSpecValue(specs, ["utilisation", "usage", "use"]);
  const sellerId = c?.seller?.id || listing?.seller?.id;
  const sellerSince = c?.seller?.createdAt ? new Date(c.seller.createdAt) : undefined;
  const sellerSinceText = sellerSince ? sellerSince.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : undefined;
  const canBuy = listing?.status === 'PUBLISHED';
  const isSold = listing?.status === 'SOLD';
  const viewerId = c?.viewerId;
  const isOwner = viewerId && sellerId ? viewerId === sellerId : false;

  // Préparer puces specs + notes
  const specChips = Object.entries(specs)
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
  const notesFromSpecs = pickSpecValue(specs, ["notes", "note", "remarque", "remarques", "commentaire", "commentaires"]);
  const notesContent = notesFromSpecs ?? (listing as any)?.notes ?? listing?.description ?? "";
  const notesPreview = truncate(notesContent, 220);

  async function send() {
    if (!text.trim()) return;
    if (sending) return;
    setSending(true);

    await fetch(`/api/marketplace/conversations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setText("");
    setSending(false);
    mutate();
  }

  // Suppression: handlers pour pièces jointes
  // function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) { /* désactivé */ }
  // function removeAttachment(idx: number) { /* désactivé */ }

  useEffect(() => {
    // Marquer comme lu quand on ouvre/actualise la conversation
    if (!data?.conversation?.id) return;
    fetch(`/api/marketplace/conversations/${id}/read`, { method: 'POST' }).then(() => {
      mutateList();
      mutate();
      // Notifier le header pour rafraîchir le badge global
      window.dispatchEvent(new Event('messages:read'));
    }).catch(() => {});
  }, [id, data?.conversation?.id, data?.conversation?.messages?.length, mutateList]);

  if (isLoading || !data) {
    return (
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 card p-4 animate-pulse h-[70vh]" />
          <div className="lg:col-span-6 card p-4 animate-pulse h-[70vh]" />
          <div className="lg:col-span-3 card p-4 animate-pulse h-[70vh]" />
        </div>
      </div>
    );
  }
  const seller = c?.seller?.name || "Vendeur";
  if (!c) return <div className="container py-6">Introuvable</div>;

  const lastActivity = ageFrom(c.updatedAt || c.messages?.[c.messages.length-1]?.createdAt) || "—";

  return (
    <div className="container py-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100dvh-3rem-0.5rem)] md:min-h-[calc(100dvh-5rem-1.5rem)]">
        {/* Colonne gauche: Liste des conversations */}
        <aside className="hidden lg:block lg:col-span-3 card p-3 overflow-hidden">
          <div className="px-2 pb-2 text-sm font-semibold">Sélectionner</div>
          <div className="overflow-y-auto max-h-[70vh] pr-1 space-y-1">
            {(listLoading ? Array.from({ length: 6 }) : convs).map((c2: any, i: number) => {
              if (listLoading) return <div key={i} className="h-16 rounded bg-white/5 animate-pulse" />;
              const last = c2.messages?.[c2.messages.length - 1];
              const preview = last?.content || (last?.imageUrl ? "(image)" : "");
              const active = c2.id === c.id;
              const img = c2.listing?.images?.[0]?.url;
              const unread = c2.unreadCount || 0;
              return (
                <Link key={c2.id} href={`/messages/${c2.id}`} className={`flex items-center gap-3 rounded p-2 hover:bg-white/5 ${active ? 'bg-white/5' : ''}`}>
                  <div className="relative h-12 w-12 rounded overflow-hidden bg-white/5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="annonce" className="h-full w-full object-cover" /> : null}
                    {unread > 0 && !active && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--accent)] ring-1 ring-black/30" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-2">
                      <span className="truncate">{c2.listing?.title || 'Conversation'}</span>
                      {unread > 0 && !active && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{preview || 'Nouveau message'}</div>
                  </div>
                  <div className="ml-auto text-[11px] text-gray-400">{ageFrom(last?.createdAt)}</div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Colonne centre: Chat */}
        <main className="lg:col-span-6 card p-0 flex flex-col h-[calc(100dvh-3rem-0.5rem)] md:h-[calc(100dvh-5rem-1.5rem)] overflow-hidden">
          {/* Header mobile: Back + vendeur + encart annonce */}
          <div className="lg:hidden">
            {/* Topbar mobile: back, avatar+nom+note, menu */}
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/10">
              <Link href="/messages" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-semibold">
                  {sellerInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate max-w-[12rem]">{sellerName}</div>
                  <div className="text-[11px] text-gray-400 truncate">Dernière activité {lastActivity}</div>
                </div>
                {/* Note (si dispo plus tard) */}
                <div className="hidden xs:flex items-center gap-1 text-[11px] text-orange-300 ml-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>4.9</span>
                </div>
              </div>
              <button className="p-1.5 rounded hover:bg-white/5"><EllipsisVertical className="h-5 w-5" /></button>
            </div>
             <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10">
               <div className="h-10 w-10 rounded overflow-hidden bg-white/5 shrink-0">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 {Array.isArray(listing?.images) && listing.images[0]?.url ? (
                   <img src={listing.images[0].url} alt="annonce" className="h-full w-full object-cover" />
                 ) : null}
               </div>
               <div className="min-w-0">
                 <Link href={`/marketplace/${listing?.id || c.listing?.id || id}`} className="text-sm font-semibold hover:underline line-clamp-1">
                   {listing?.title || c.listing?.title || 'Annonce'}
                 </Link>
                 {price ? <div className="text-xs text-gray-400">{price}</div> : null}
               </div>
             </div>
           </div>

           {/* A propos du vendeur */}
           <div className="px-4 pt-4">
             <div className="rounded border border-white/10 p-3 text-sm">
               <div className="font-semibold mb-1">À propos de ce vendeur</div>
               <ul className="space-y-1.5 text-gray-300">
                 {locationLine && (
                   <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> <span>{locationLine}</span></li>
                 )}
                 <li className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>Membre depuis {sellerSinceText || '—'}</span></li>
                 <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> <span>Transactions sécurisées: —</span></li>
               </ul>
             </div>
           </div>

           {/* Fil de messages */}
           <div className="flex-1 overflow-y-auto px-4 py-4">
             <div className="text-center text-xs text-gray-500 mb-3">Aujourd'hui</div>
             <div className="space-y-3">
               {c.messages?.map((m: any, idx: number) => {
                 const mine = m.authorId === c.viewerId;
                 const imgs = Array.isArray(m.images) ? m.images.map((im: any) => im.url).filter(Boolean) : [];
                 return (
                   <div key={m.id || idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] px-3.5 py-2.5 text-[15px] shadow-sm ${mine ? 'bg-[var(--accent)]/90 text-white rounded-2xl rounded-tr-none' : 'bg:white/10 text-white/90 rounded-2xl rounded-tl-none'}`.replace('bg:white','bg-white') }>
                       {m.content ? <div className="whitespace-pre-wrap leading-5">{m.content}</div> : null}

                       {/* Images */}
                       {imgs.length > 0 && (
                         <div className="mt-2 grid grid-cols-2 gap-2">
                           {imgs.map((src: string, i: number) => (
                             <div key={i} className="relative overflow-hidden rounded">
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img src={src} alt={`image-${i+1}`} className="w-full h-full object-cover max-h-52" />
                             </div>
                           ))}
                         </div>
                       )}

                       {/* Unique imageUrl (legacy) */}
                       {!imgs.length && m.imageUrl ? (
                         <div className="mt-2 overflow-hidden rounded">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={m.imageUrl} alt="image" className="max-h-52 object-cover" />
                         </div>
                       ) : null}

                       {/* Footer */}
                       <div className="mt-1 text-[11px] opacity-70 text-right inline-flex items-center gap-1">
                         <span>{ageFrom(m.createdAt)}</span>
                         {mine ? (
                           m.readAt ? <span className="text-emerald-300">Vu</span> : <Check className="h-3.5 w-3.5 opacity-80" />
                         ) : null}
                       </div>
                     </div>
                   </div>
                 );
               })}
              <div ref={endRef} />
             </div>
           </div>

          {/* Barre d’actions et composer */}
          <div className="border-t border-white/10 p-3">
            {(!isOwner) && (
              <div className="flex mb-3">
                <button
                  className="btn-primary w-full"
                  onClick={() => router.push(`/checkout?listingId=${listing?.id || c.listing?.id}`)}
                  disabled={!canBuy}
                  title={canBuy ? "Définir l’adresse et payer" : (isSold ? "Vendu" : "Indisponible")}
                  aria-label={canBuy ? "Acheter" : (isSold ? "Vendu" : "Indisponible")}
                >
                  {canBuy ? 'Acheter' : (isSold ? 'Vendu' : 'Indisponible')}
                </button>
              </div>
            )}

            {/* Previews des pièces jointes */}
            {/* (Désactivé: politique aucune pièce jointe/aucun lien) */}
            {/* attachments.length > 0 && (...previews...) */}

            <div className="flex items-center gap-2">
              {/* Input fichier et bouton + supprimés */}
              <input
                className="flex-1 input-dark h-12 text-[15px]"
                placeholder="Écrivez votre message"
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button onClick={send} disabled={sending || !text.trim()} className="btn-primary h-12 px-4 inline-flex items-center justify-center">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              En savoir plus sur nos politiques. <Link href="/privacy" className="underline">Voir</Link>
            </div>
          </div>
        </main>

        {/* Colonne droite: Vendeur + Résumé annonce */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="card p-4 flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
              {(seller || 'V').charAt(0).toUpperCase()
            }</div>
            <div className="min-w-0">
              <div className="font-semibold">{sellerId ? <Link href={`/marketplace/seller/${sellerId}`} className="hover:underline">{seller}</Link> : seller}</div>
              <div className="text-xs text-gray-400">Dernière activité {lastActivity}</div>
            </div>
          </div>
          <div className="card p-5">
            <div className="text-lg font-semibold mb-3">Résumé de l'annonce</div>
            <Link href={`/marketplace/${listing?.id || c.listing?.id || id}`} className="font-semibold hover:underline block">
              {listing?.title || c.listing?.title || 'Annonce'}
            </Link>
            {price && <div className="text-[18px] font-bold mt-1">{price}</div>}
            <div className="text-xs text-gray-400 mt-1">{published || ''}</div>
            <div className="text-xs text-gray-400 mt-1">par {sellerId ? <Link href={`/marketplace/seller/${sellerId}`} className="hover:underline">{sellerName}</Link> : sellerName}</div>

            {/* Composants (specs) */}
            {specChips.length ? (
              <div className="mt-4">
                <div className="font-semibold mb-2">Composants</div>
                <ul className="flex flex-wrap gap-2">
                  {specChips.map((c) => (
                    <li key={c.key} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs border ${c.cls}`} title={`${c.label}: ${c.value}`}>
                      <span className="text-white/85">{c.icon}</span>
                      <span className="font-medium">{c.label}:</span>
                      <span className="truncate max-w-[16rem]">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Notes (au lieu de Description) */}
            {notesContent && (
              <div className="mt-4">
                <div className="font-semibold mb-1">Notes</div>
                <div className="text-sm text-gray-200 whitespace-pre-line">{notesPreview}</div>
                <Link href={`/marketplace/${listing?.id || c.listing?.id || id}`} className="text-[13px] underline mt-1 inline-block">Voir plus</Link>
              </div>
            )}

            <div className="mt-4">
              <div className="font-semibold mb-2">Critères</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {critEtat && (<><div className="text-gray-400">État</div><div className="font-medium">{critEtat}</div></>)}
                {critType && (<><div className="text-gray-400">Type</div><div className="font-medium">{critType}</div></>)}
                {critUse && (<><div className="text-gray-400">Utilisation</div><div className="font-medium">{critUse}</div></>)}
              </div>
            </div>

            {locationLine && (
              <div className="mt-4">
                <div className="font-semibold mb-1">Localisation</div>
                <div className="text-sm text-gray-200">{locationLine}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
