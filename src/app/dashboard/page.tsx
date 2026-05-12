"use client";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useSWR<{ user: any; recentOrders: any[] }>("/api/account", fetcher);

  const user = me?.user;
  const orders = me?.recentOrders || [];

  const [openedOrderId, setOpenedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [orderLoadingDetail, setOrderLoadingDetail] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") router.replace("/admin");
  }, [user?.role, router]);

  if (user?.role === "ADMIN") return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-16 md:pb-20 space-y-12 md:space-y-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tableau de bord</h1>

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

      <section className="grid gap-6 md:gap-8 sm:grid-cols-2">
        <Link href="/orders" className="card hover-card p-5 md:p-6 min-h-[140px] md:min-h-[160px]">
          <div className="text-lg" aria-hidden>
            📦
          </div>
          <div className="mt-2 md:mt-3 font-semibold text-base">Mes commandes</div>
          <div className="text-xs text-white/70">Suivi et historique boutique</div>
        </Link>
        <Link href="/account" className="card hover-card p-5 md:p-6 min-h-[140px] md:min-h-[160px]">
          <div className="text-lg" aria-hidden>
            ⚙️
          </div>
          <div className="mt-2 md:mt-3 font-semibold text-base">Mon compte</div>
          <div className="text-xs text-white/70">Profil et moyens de paiement</div>
        </Link>
      </section>

      <section className="space-y-8 md:space-y-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-semibold">Mes dernières commandes</h2>
          <Link href="/orders" className="text-sm text-[var(--accent)] hover:underline">
            Voir tout
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-white/70">Pas encore de commande.</div>
        ) : (
          <div className="grid gap-5 md:gap-6">
            {orders.map((o) => (
              <div key={o.id} className="card p-4 md:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
                  <div className="text-sm">#{o.id}</div>
                  <div className="text-sm font-semibold">{(o.amountCents / 100).toFixed(2)} €</div>
                  <div className="text-xs uppercase text-white/60">{o.status}</div>
                  <div className="text-xs text-white/60">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
                  <button
                    className="btn-ghost text-sm"
                    onClick={async () => {
                      if (openedOrderId === o.id) {
                        setOpenedOrderId(null);
                        setOrderDetail(null);
                        return;
                      }
                      setOpenedOrderId(o.id);
                      setOrderLoadingDetail(true);
                      try {
                        const res = await fetch(`/api/orders/${o.id}`);
                        const j = await res.json();
                        if (res.ok) setOrderDetail(j.order);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setOrderLoadingDetail(false);
                      }
                    }}
                  >
                    {openedOrderId === o.id ? "Réduire" : "Voir"}
                  </button>
                </div>

                {openedOrderId === o.id && (
                  <div className="mt-2 border-t border-white/10 pt-3">
                    {orderLoadingDetail && <div className="text-white/60">Chargement…</div>}
                    {!orderLoadingDetail && orderDetail && (
                      <div className="grid gap-3">
                        <div className="text-sm">
                          <strong>Montant:</strong> {(orderDetail.amountCents / 100).toFixed(2)} {orderDetail.currency}
                        </div>
                        <div className="text-sm">
                          <strong>Email:</strong> {orderDetail.email}
                        </div>
                        {orderDetail.shippingName && (
                          <div className="text-sm">
                            <strong>Nom:</strong> {orderDetail.shippingName}
                          </div>
                        )}
                        {(() => {
                          try {
                            const notes = orderDetail.invoiceNotes ? JSON.parse(orderDetail.invoiceNotes) : null;
                            return notes?.phone ? (
                              <div className="text-sm">
                                <strong>Téléphone:</strong> {notes.phone}
                              </div>
                            ) : null;
                          } catch {
                            return null;
                          }
                        })()}
                        {orderDetail.shippingAddr1 && (
                          <div className="text-sm">
                            <strong>Adresse:</strong>
                            <br />
                            {orderDetail.shippingAddr1}
                            <br />
                            {orderDetail.shippingAddr2 && (
                              <>
                                {orderDetail.shippingAddr2}
                                <br />
                              </>
                            )}
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
                                    <img
                                      src={item.product.images[0].url}
                                      alt={item.product.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div>{item.product?.name || "Produit"}</div>
                                    {item.variant && <div className="text-xs text-white/60">{item.variant.name}</div>}
                                  </div>
                                  <div className="text-white/60">×{item.quantity}</div>
                                  <div className="font-semibold">{(item.priceCents / 100).toFixed(2)} €</div>
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
