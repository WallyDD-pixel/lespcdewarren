"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/store/cart";
import { usePathname } from "next/navigation";

type UserInfo = { email: string; role: "USER" | "ADMIN" } | undefined;

// Icône panier SVG
function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l1 9h11l2-7H6" />
    </svg>
  );
}

export default function Header({ user }: { user?: UserInfo extends undefined ? never : { email: string; role: "USER" | "ADMIN" } }) {
  const items = useCart((s) => s.items);
  const countSelector = useCart((s) => s.count());
  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const [bump, setBump] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const [msgCount, setMsgCount] = useState(0);

  // Charger le nombre de conversations (badge messagerie)
  useEffect(() => {
    if (!user) { setMsgCount(0); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/marketplace/messages", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!alive) return;
        const n = Array.isArray(j?.conversations)
          ? j.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
          : 0;
        setMsgCount(n);
      } catch { /* ignore */ }
    };
    load();
    const onFocus = () => load();
    const onRead = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("messages:read", onRead);
    const id = setInterval(load, 30000);
    return () => { alive = false; window.removeEventListener("focus", onFocus); window.removeEventListener("messages:read", onRead); clearInterval(id as any); };
  }, [user]);

  // Charger notifications
  useEffect(() => {
    if (!user) { setNotifs([]); setNotifCount(0); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!alive) return;
        const items = Array.isArray(j?.notifications) ? j.notifications : [];
        setNotifs(items);
        setNotifCount(items.filter((n: any) => !n.readAt).length);
      } catch {}
    };
    load();

    // SSE: abonnement en temps réel
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.type === "notification" && data.notification) {
            setNotifs((list) => [data.notification, ...list].slice(0, 30));
            setNotifCount((n) => n + 1);
          }
        } catch {}
      };
      // Optionnel: reconnexion simple
      es.onerror = () => {
        es?.close();
        es = null;
        // Tentative de reconnexion après 5s
        setTimeout(() => {
          if (!alive) return;
          // recreate
          const e2 = new EventSource("/api/notifications/stream");
          es = e2;
          e2.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data);
              if (data?.type === "notification" && data.notification) {
                setNotifs((list) => [data.notification, ...list].slice(0, 30));
                setNotifCount((n) => n + 1);
              }
            } catch {}
          };
        }, 5000);
      };
    } catch {}

    const id = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(id as any); window.removeEventListener("focus", onFocus); es?.close(); };
  }, [user]);

  // Pulse the cart when an item is added
  useEffect(() => {
    const handler = () => {
      setBump(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setBump(false), 450);
    };
    window.addEventListener("cart:add", handler as EventListener);
    return () => window.removeEventListener("cart:add", handler as EventListener);
  }, []);

  // Improve menu behavior: lock scroll and close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close user menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifs((arr) => arr.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setNotifCount(0);
    } catch {}
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/10 transition-shadow ${
        open
          ? "bg-black"
          : "backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/50"
      } ${scrolled ? "shadow-[0_2px_24px_rgba(0,0,0,0.45)]" : ""}`}
    >
      {/* Accent glow line */}
      <div className="pointer-events-none h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />

      <nav className="container flex h-14 items-center justify-between text-sm">
  <div className="flex items-center gap-3 md:gap-8">
          {/* Mobile menu button (animated) */}
          <button
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-black/30 hover:bg-white/5 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-white"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Fermer" : "Ouvrir"} le menu</span>
            <div className="relative h-4 w-6">
              <span
                className={`absolute left-0 right-0 top-1/2 -mt-[1px] h-0.5 w-6 bg-white rounded transition-transform duration-300 ease-out ${open ? "rotate-45" : "-translate-y-1.5"}`}
              />
              <span
                className={`absolute left-0 right-0 top-1/2 -mt-[1px] h-0.5 w-6 bg-white rounded transition-all duration-300 ease-out ${open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"}`}
              />
              <span
                className={`absolute left-0 right-0 top-1/2 -mt-[1px] h-0.5 w-6 bg-white rounded transition-transform duration-300 ease-out ${open ? "-rotate-45" : "translate-y-1.5"}`}
              />
            </div>
          </button>

          <Link href="/" className="font-bold text-white">lespcdewarren</Link>

          {/* Desktop menu */}
          <ul className="hidden md:flex items-center gap-6 text-white/80">
            { [
              { href: "/", label: "ACCUEIL" },
              { href: "/devis", label: "CONFIGURER MON PC" },
              { href: "/catalogue", label: "CATALOGUE" },
            ].map((l) => (
              <li key={l.href} className="relative group">
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`hover:text-white transition-colors ${isActive(l.href) ? "text-[var(--accent)] font-semibold" : ""}`}
                >
                  {l.label}
                </Link>
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-[var(--accent)] transition-all duration-300 ease-out ${
                    isActive(l.href) ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton panier mobile supplémentaire */}
          <div className="md:hidden flex items-center">
            <Link
              href="/panier"
              aria-label="Panier"
              className="inline-flex relative items-center justify-center h-10 w-10 rounded-md border border-white/10 text-white/80 hover:bg-white/5 bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition overflow-hidden"
              title="Panier"
              passHref
            >
              <span className="w-full h-full flex items-center justify-center">
                <CartIcon className="h-6 w-6" />
                {count > 0 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0.5 right-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[var(--accent)] text-[9px] sm:text-[10px] text-black font-bold grid place-items-center shadow ring-1 ring-black/30"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
            </Link>
          </div>
          {user ? (
            <>
              {/* Cloche notifications */}
              <div className="relative">
                <button
                  aria-label="Notifications"
                  className="inline-flex relative items-center justify-center h-10 w-10 rounded-md border border-white/10 text-white/80 hover:bg-white/5 bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition overflow-hidden"
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 21a2 2 0 0 0 4 0"/>
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/>
                  </svg>
                  {notifCount > 0 && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-0.5 right-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-red-400 text-[9px] sm:text-[10px] text-black font-bold grid place-items-center shadow ring-1 ring-black/30"
                    >
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-[60vh] overflow-auto rounded-md border border-white/10 bg-zinc-900/95 backdrop-blur text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                      <div className="font-semibold">Notifications</div>
                      <button className="btn-ghost text-xs" onClick={markAllRead}>Tout marquer lu</button>
                    </div>
                    <ul className="divide-y divide-white/10">
                      {notifs.length === 0 && <li className="px-3 py-3 text-sm text-white/70">Aucune notification</li>}
                      {notifs.map((n) => {
                        const orderId = (n as any)?.data?.marketplaceOrderId;
                        const isShipment = typeof n?.title === 'string' && n.title.toLowerCase().includes('expédi');
                        const derived = orderId && isShipment ? `/marketplace/my-orders?id=${orderId}` : undefined;
                        const href = derived || n.link || '#';
                        const onClick = async (e: React.MouseEvent) => {
                          // Marquer comme lu immédiatement côté UI
                          setNotifs((arr) => arr.map((x) => x.id === n.id ? { ...x, readAt: x.readAt || new Date().toISOString() } : x));
                          setNotifCount((c) => Math.max(0, c - (n.readAt ? 0 : 1)));
                          // Marquer lu côté serveur (best-effort)
                          try { await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }); } catch {}
                          // Laisser le lien agir (ne pas preventDefault si href !== '#')
                        };
                        return (
                          <li key={n.id} className="px-3 py-2 text-sm">
                            <a href={href} onClick={onClick} className="block">
                              <div className="font-medium">{n.title}</div>
                              {n.message && <div className="text-white/70 text-xs">{n.message}</div>}
                              <div className="text-[11px] text-white/50 mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <Link
                href="/messages"
                aria-label="Messagerie"
                className="inline-flex relative items-center justify-center h-10 w-10 rounded-md border border-white/10 text-white/80 hover:bg-white/5 bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition overflow-hidden"
                title="Messagerie"
              >
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 1 14V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8z"/>
                  <path d="M8 9h8M8 13h5"/>
                </svg>
                {msgCount > 0 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0.5 right-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[var(--accent)] text-[9px] sm:text-[10px] text-black font-bold grid place-items-center shadow ring-1 ring-black/30"
                  >
                    {msgCount > 9 ? "9+" : msgCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="hidden sm:inline-flex items-center justify-center border border-white/10 text-white/80 rounded-md px-3 py-2 hover:bg-white/5 backdrop-blur"
                >
                  <span className="mr-2">👤</span>
                  <span className="max-w-[12rem] truncate">{user.email}</span>
                </button>
                {userMenuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 rounded-md border border-white/10 bg-zinc-900/95 backdrop-blur text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden">
                    {user.role === "ADMIN" ? (
                      <>
                        <Link href="/admin" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Tableau de bord admin</Link>
                        <Link href="/marketplace/seller/dashboard" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Espace vendeur</Link>
                        <Link href="/marketplace/my-orders" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Mes achats marketplace</Link>
                        <Link href="/marketplace/new" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Vendre mon ordinateur</Link>
                      </>
                    ) : (
                      <>
                        <Link href="/orders" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Suivi de commande</Link>
                        <Link href="/account" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Mon compte</Link>
                        <Link href="/marketplace/my-orders" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Mes achats marketplace</Link>
                        <Link href="/marketplace/seller/dashboard" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Espace vendeur</Link>
                        <Link href="/marketplace/new" className="block px-3 py-2 hover:bg-white/5" role="menuitem">Vendre mon ordinateur</Link>
                      </>
                    )}
                    <div className="my-1 h-px bg-white/10" />
                    <button onClick={handleLogout} className="block w-full text-left px-3 py-2 hover:bg-white/5" role="menuitem">Se déconnecter</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login" className="hidden sm:inline-flex items-center justify-center border border-white/10 text-white/80 rounded-md px-3 py-2 hover:bg-white/5">Se connecter</Link>
          )}
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {open && (
        <div className="fixed inset-0 z-[2147483647] md:hidden" role="dialog" aria-modal="true">
          <div id="mobile-menu" className="absolute inset-0 bg-black text-white overflow-y-auto pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-4 border-b border-white/10 bg-black">
              <span className="text-[var(--accent)] font-semibold">Menu</span>
              <button aria-label="Fermer le menu" onClick={() => setOpen(false)} className="h-9 w-9 grid place-items-center rounded border border-white/10 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">✕</button>
            </div>
            <nav className="px-5 py-4 space-y-1">
              <Link href="/" onClick={() => setOpen(false)} className={`block rounded-lg px-4 py-3 text-base font-medium hover:bg-white/5 active:bg-white/10 ${isActive("/") ? "text-[var(--accent)] font-semibold bg-white/[0.03]" : ""}`}>ACCUEIL</Link>
              <Link href="/devis" onClick={() => setOpen(false)} className={`block rounded-lg px-4 py-3 text-base font-medium hover:bg-white/5 active:bg-white/10 ${isActive("/devis") ? "text-[var(--accent)] font-semibold bg-white/[0.03]" : ""}`}>CONFIGURER MON PC</Link>
              <Link href="/catalogue" onClick={() => setOpen(false)} className={`block rounded-lg px-4 py-3 text-base font-medium hover:bg-white/5 active:bg-white/10 ${isActive("/catalogue") ? "text-[var(--accent)] font-semibold bg-white/[0.03]" : ""}`}>CATALOGUE</Link>

              {user ? (
                <div className="mt-5 pt-5 border-t border-white/10 space-y-1">
                  {user.role === "ADMIN" ? (
                    <>
                      <Link href="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Tableau de bord admin</Link>
                      <Link href="/marketplace/seller/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Espace vendeur</Link>
                      <Link href="/marketplace/my-orders" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Mes achats marketplace</Link>
                      <Link href="/marketplace/new" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Vendre mon ordinateur</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/orders" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Suivi de commande</Link>
                      <Link href="/account" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Mon compte</Link>
                      <Link href="/marketplace/my-orders" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Mes achats marketplace</Link>
                      <Link href="/marketplace/seller/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Espace vendeur</Link>
                      <Link href="/marketplace/new" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Vendre mon ordinateur</Link>
                    </>
                  )}
                  <button onClick={() => { setOpen(false); handleLogout(); }} className="mt-2 block w-full text-left rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Se déconnecter</button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="mt-5 block rounded-lg px-4 py-3 text-base hover:bg-white/5 active:bg-white/10">Se connecter</Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Floating action on desktop: Cart bottom-right */}
      <button
        id="cart-bubble-desktop"
        onClick={() => (window.location.href = "/panier")}
        className={`hidden md:inline-flex fixed bottom-4 right-4 z-[60] items-center whitespace-nowrap gap-2 h-11 rounded-full border border-white/10 bg-black/60 backdrop-blur px-4 text-white shadow-[0_10px_30px_rgba(109,40,217,0.35)] hover:shadow-[0_12px_36px_rgba(109,40,217,0.5)] hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 transition-transform ${
          bump ? "scale-[1.04]" : "scale-100"
        } ${open ? "opacity-0 pointer-events-none" : ""}`}
        aria-label={`Voir le panier (${count} article${count > 1 ? "s" : ""})`}
      >
        <span aria-hidden className="grid place-items-center h-5 w-5 leading-none"><CartIcon className="h-5 w-5" /></span>
        <span className="text-sm leading-none font-medium tabular-nums">{count}</span>
      </button>
    </header>
  );
}
