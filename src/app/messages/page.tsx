"use client";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());

// Helpers
function ageFrom(input?: string | null) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `il y a ${Math.max(1, mins)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} ${h > 1 ? "heures" : "heure"}`;
  const days = Math.floor(h / 24);
  return `il y a ${days} ${days > 1 ? "jours" : "jour"}`;
}

export default function MessagesPage() {
  const { data } = useSWR<{ conversations: any[] }>("/api/marketplace/messages", fetcher, { refreshInterval: 5000, revalidateOnFocus: true });
  const convs = data?.conversations || [];
  const loading = !data;
  return (
    <div className="container md:py-6 py-2">
      <h1 className="text-2xl font-bold mb-3 md:mb-4">Messages</h1>

      {loading ? (
        <div className="space-y-3">
          <div className="card p-4 animate-pulse h-20" />
          <div className="card p-4 animate-pulse h-20" />
          <div className="card p-4 animate-pulse h-20" />
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {convs.map((c) => {
            const last = c.messages?.[c.messages.length - 1];
            const preview = last?.content || (last?.imageUrl || (last?.images?.length ? "(images)" : "")) || "";
            const img = c.listing?.images?.[0]?.url;
            const unread = c.unreadCount || 0;
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="card px-3 py-3 md:p-4 hover:bg-white/5 transition border border-white/10 block">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 rounded overflow-hidden bg-white/5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="annonce" className="h-full w-full object-cover" /> : null}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[var(--accent)] text-black text-[11px] font-bold grid place-items-center shadow ring-1 ring-black/30">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-[15px] md:text-base flex items-center gap-2">
                      <span className="truncate">{c.listing?.title || "Conversation"}</span>
                      {unread > 0 && <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />}
                    </div>
                    <div className="mt-1 inline-block rounded-2xl bg-white/10 px-3 py-1.5 text-xs text-white/90 max-w-full truncate">
                      {preview || "Nouveau message"}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 self-start hidden sm:block">
                    {ageFrom(last?.createdAt)}
                  </div>
                </div>
              </Link>
            );
          })}
          {convs.length === 0 && (
            <div className="text-sm text-gray-400">Aucune conversation pour le moment.</div>
          )}
        </div>
      )}
    </div>
  );
}
