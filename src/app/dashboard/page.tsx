"use client";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const router = useRouter();
  const { data: me, mutate } = useSWR<{ user: any; recentOrders: any[]; recentMarketplaceOrders: any[] }>("/api/account", fetcher);
  const { data: listings } = useSWR<{ data: any[] }>("/api/marketplace/listings?mine=1", fetcher);

  const user = me?.user;
  const orders = me?.recentOrders || [];
  const mpOrders = me?.recentMarketplaceOrders || [];
  const myListings = listings?.data || [];

  // Expansion state for marketplace orders
  const [openedMpOrderId, setOpenedMpOrderId] = useState<number | null>(null);
  const [mpDetail, setMpDetail] = useState<any | null>(null);
  const [mpLoadingDetail, setMpLoadingDetail] = useState(false);

  // Expansion state for boutique orders
  const [openedOrderId, setOpenedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [orderLoadingDetail, setOrderLoadingDetail] = useState(false);

  // If admin, redirect to admin dashboard
  useEffect(() => {
    if (user?.role === "ADMIN") router.replace("/admin");
  }, [user?.role, router]);

  if (user?.role === "ADMIN") return null;

  async function markReceived(id: number) {
    const res = await fetch(`/api/marketplace/orders/${id}/confirm-received`, { method: "POST" });
    if (res.ok) {
      await mutate();
    } else {
      const j = await res.json().catch(() => null);
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: j?.error || 'Erreur', type: 'error' } }));
    }
  }

  // remise en mains propres modal state
  const [showHandOverModal, setShowHandOverModal] = useState(false);
  const [handOverOrderId, setHandOverOrderId] = useState<number | null>(null);
  const [markingHandOver, setMarkingHandOver] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-16 md:pb-20 space-y-12 md:space-y-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tableau de bord</h1>

      {/* Profile snapshot */}
      <section className="section-contrast p-5 md:p-6">
        <div className="grid gap-6 md:gap-8 sm:grid-cols-3">
          <div>
            <div className="text-white/70 text-sm">Utilisateur</div>
            <div className="font-semibold text-base md:text-lg">{user?.name || user?.email || "—"}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm">Inscription</div>
            <div className="text-white/70">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—"}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm">Rôle</div>
            <div className="text-white/70">{user?.role || "—"}</div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-6 md:gap-8 sm:grid-cols-2">
        <Link href="/marketplace/new" className="card hover-card p-5 md:p-6 min-h-[140px] md:min-h-[160px]">
          <div className="text-lg" aria-hidden>➕</div>
          <div className="mt-2 md:mt-3 font-semibold text-base">Vendre un ordinateur</div>
          <div className="text-xs text-white/70">Publier une nouvelle annonce</div>
        </Link>
        <Link href="/messages" className="card hover-card p-5 md:p-6 min-h-[140px] md:min-h-[160px]">
          <div className="text-lg" aria-hidden>💬</div>
          <div className="mt-2 md:mt-3 font-semibold text-base">Messagerie</div>
          <div className="text-xs text-white/70">Consulter vos conversations</div>
        </Link>
      </section>

      {/* My listings */}
      <section className="space-y-8 md:space-y-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-semibold">Mes annonces</h2>
          <Link href="/marketplace/new" className="text-sm text-[var(--accent)] hover:underline">Nouvelle annonce</Link>
        </div>
        {myListings.length === 0 ? (
          <div className="text-white/70">Aucune annonce. <Link className="text-[var(--accent)] hover:underline" href="/marketplace/new">Créer ma première annonce</Link>.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {myListings.map((l) => (
              <Link key={l.id} href={`/marketplace/${l.id}`} className="border border-white/10 rounded-lg overflow-hidden hover:shadow-md transition">
                <div className="aspect-video bg-gray-100/10">
                  {l.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].url} alt={l.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4 md:p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1">{l.title}</h3>
                    <span className="text-xs uppercase text-white/60">{l.status}</span>
                  </div>
                  <p className="text-sm text-gray-300">{(l.priceCents/100).toFixed(2)} €</p>
                  <p className="text-xs text-gray-500">{l.city || ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent marketplace orders */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Mes achats marketplace</h2>
          <Link href="/messages" className="text-sm text-[var(--accent)] hover:underline">Contacter un vendeur</Link>
        </div>
        {mpOrders.length === 0 ? (
          <div className="text-white/70">Aucun achat marketplace.</div>
        ) : (
          <div className="grid gap-4">
            {mpOrders.map((o) => (
              <div key={o.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between w-full">
                  <div className="min-w-0">
                    <div className="text-sm text-white/60">Commande n°{o.id} • {new Date(o.createdAt).toLocaleDateString("fr-FR")} • {o.listing?.title || "Annonce"}</div>
                    <div className="text-xs uppercase text-white/60">Statut: {o.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.status === "PAID" && (
                      <>
                        <button className="btn-secondary" onClick={() => markReceived(o.id)}>Marquer reçu</button>
                        <button className="btn-ghost" onClick={() => { setHandOverOrderId(o.id); setShowHandOverModal(true); }}>Remise en mains propres</button>
                      </>
                    )}
                    <Link className="btn-ghost" href={`/marketplace/${o.listing?.id || ""}`}>Voir l’annonce</Link>
                    <button className="btn-ghost" onClick={async () => {
                      // toggle expansion
                      if (openedMpOrderId === o.id) { setOpenedMpOrderId(null); setMpDetail(null); return; }
                      setOpenedMpOrderId(o.id);
                      setMpLoadingDetail(true);
                      try {
                        const res = await fetch(`/api/marketplace/my-orders/${o.id}`);
                        const j = await res.json();
                        if (res.ok) setMpDetail(j.order);
                      } catch (e) {
                        console.error(e);
                      } finally { setMpLoadingDetail(false); }
                    }}>{openedMpOrderId === o.id ? 'Réduire' : 'Détails'}</button>
                  </div>
                </div>

                {openedMpOrderId === o.id && (
                  <div className="mt-2 border-t border-white/10 pt-3">
                    {mpLoadingDetail && <div className="text-white/60">Chargement…</div>}
                    {!mpLoadingDetail && mpDetail && (
                      <div className="grid gap-2">
                        <div className="text-sm">Produit: {mpDetail.listing?.title || '—'}</div>
                        <div className="text-sm">Vendeur: {mpDetail.seller?.name || mpDetail.seller?.email || `#${mpDetail.seller?.id}`}</div>
                        <div className="text-sm">Prix: {(mpDetail.amountCents/100).toFixed(2)} {mpDetail.currency}</div>
                        {/* Afficher preuve(s) si messageImages présentes */}
                        {Array.isArray(mpDetail.messages) && mpDetail.messages.length > 0 && (
                          <div>
                            <div className="text-sm text-white/60">Preuves associées:</div>
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {mpDetail.messages.map((m: any) => (
                                Array.isArray(m.images) && m.images.map((img: any, i: number) => (
                                  <a key={`${m.id}-${i}`} href={img.url} target="_blank" rel="noreferrer">
                                    <img src={img.url} alt="preuve" className="h-20 w-full object-cover rounded border border-white/10" />
                                  </a>
                                ))
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section className="space-y-8 md:space-y-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-semibold">Mes dernières commandes</h2>
          <Link href="/orders" className="text-sm text-[var(--accent)] hover:underline">Voir tout</Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-white/70">Pas encore de commande.</div>
        ) : (
          <div className="grid gap-5 md:gap-6">
            {orders.map((o) => (
              <div key={o.id} className="card p-4 md:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
                  <div className="text-sm">#{o.id}</div>
                  <div className="text-sm font-semibold">{(o.amountCents/100).toFixed(2)} €</div>
                  <div className="text-xs uppercase text-white/60">{o.status}</div>
                  <div className="text-xs text-white/60">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
                  <button className="btn-ghost text-sm" onClick={async () => {
                    if (openedOrderId === o.id) { setOpenedOrderId(null); setOrderDetail(null); return; }
                    setOpenedOrderId(o.id);
                    setOrderLoadingDetail(true);
                    try {
                      const res = await fetch(`/api/orders/${o.id}`);
                      const j = await res.json();
                      if (res.ok) setOrderDetail(j.order);
                    } catch (e) {
                      console.error(e);
                    } finally { setOrderLoadingDetail(false); }
                  }}>{openedOrderId === o.id ? 'Réduire' : 'Voir'}</button>
                </div>

                {openedOrderId === o.id && (
                  <div className="mt-2 border-t border-white/10 pt-3">
                    {orderLoadingDetail && <div className="text-white/60">Chargement…</div>}
                    {!orderLoadingDetail && orderDetail && (
                      <div className="grid gap-3">
                        <div className="text-sm"><strong>Montant:</strong> {(orderDetail.amountCents/100).toFixed(2)} {orderDetail.currency}</div>
                        <div className="text-sm"><strong>Email:</strong> {orderDetail.email}</div>
                        {orderDetail.shippingName && <div className="text-sm"><strong>Nom:</strong> {orderDetail.shippingName}</div>}
                        {(() => {
                          try {
                            const notes = orderDetail.invoiceNotes ? JSON.parse(orderDetail.invoiceNotes) : null;
                            return notes?.phone ? <div className="text-sm"><strong>Téléphone:</strong> {notes.phone}</div> : null;
                          } catch {
                            return null;
                          }
                        })()}
                        {orderDetail.shippingAddr1 && (
                          <div className="text-sm">
                            <strong>Adresse:</strong><br/>
                            {orderDetail.shippingAddr1}<br/>
                            {orderDetail.shippingAddr2 && <>{orderDetail.shippingAddr2}<br/></>}
                            {orderDetail.shippingZip} {orderDetail.shippingCity}
                          </div>
                        )}
                        {orderDetail.items && orderDetail.items.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold mb-2">Articles:</div>
                            <div className="grid gap-2">
                              {orderDetail.items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 text-sm">
                                  {item.product?.images?.[0]?.url && (
                                    <img src={item.product.images[0].url} alt={item.product.name} className="w-12 h-12 object-cover rounded" />
                                  )}
                                  <div className="flex-1">
                                    <div>{item.product?.name || 'Produit'}</div>
                                    {item.variant && <div className="text-xs text-white/60">{item.variant.name}</div>}
                                  </div>
                                  <div className="text-white/60">×{item.quantity}</div>
                                  <div className="font-semibold">{(item.priceCents/100).toFixed(2)} €</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Hand-over modal (global in this component)
{/** Note: modal JSX must be rendered inside the component return; easier approach is to export small helper but here we keep it inline **/}