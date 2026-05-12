"use client";
import { useEffect, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { useRouter } from "next/navigation";

export default function AdminContestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [optOptimisation, setOptOptimisation] = useState(false);
  const [optWifi, setOptWifi] = useState(false);
  // adresse
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await fetch(`/api/products`);
        const pj = await p.json();
        setProducts(pj?.products || []);
        if ((pj?.products || []).length) setProductId((pj.products[0]?.id) ?? null);
      } catch {}
    })();
  }, []);

  function computePrice(base: number) {
    let p = base || 0;
  if (optOptimisation) p += 4999;
  if (optWifi) p += 1999;
    return p;
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return alert("Choisissez un PC");
    const prod = products.find((x) => x.id === productId);
    if (!prod) return alert("Produit introuvable");
    const priceCents = computePrice(prod.priceCents || 0);
    setLoading(true);
    try {
    const res = await fetch(`/api/admin/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          productId,
      priceCents,
      options: { optimisation: optOptimisation, wifiAdapter: optWifi },
      address,
      zip,
      city,
        }),
      });
      const j = await res.json();
      if (!j?.ok) return alert("Erreur: " + (j?.error || "?"));
      alert("Commande créée — id: " + j.order?.id);
      router.push('/admin/orders');
    } catch (err: any) {
      alert(err?.message || String(err));
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-6">
  <h2 className="text-xl font-semibold">Créer une commande manuelle</h2>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="section-contrast p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Produits</h3>
              <div className="flex items-center gap-2">
                <button className="btn-ghost">Ajouter un article personnalisé</button>
              </div>
            </div>

            <form onSubmit={createOrder} className="grid gap-3">
              <div className="grid md:grid-cols-2 gap-2 mb-2">
                <select className="input" value={productId ?? 0} onChange={(e) => setProductId(Number(e.target.value))}>
                  {(products || []).map((p) => <option key={p.id} value={p.id}>{p.name} — {(p.priceCents/100).toFixed(2)}€</option>)}
                </select>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={optOptimisation} onChange={(e) => setOptOptimisation(e.target.checked)} /> Optimisation (+49,99€)</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={optWifi} onChange={(e) => setOptWifi(e.target.checked)} /> Adaptateur Wi‑Fi (+19,99€)</label>
                </div>
              </div>

              <div className="section-contrast p-3">
                <div className="text-sm text-white/70">Paiement</div>
                <div className="mt-3">
                  <div className="flex justify-between"><span>Sous-total</span><span>{(products.find((x) => x.id === productId)?.priceCents/100 || 0).toFixed(2)} €</span></div>
                  <div className="flex justify-between mt-2"><span>Ajouter une réduction</span><span>—</span></div>
                  <div className="flex justify-between mt-2"><span>Ajouter l'expédition ou la livraison</span><span>—</span></div>
                  <div className="flex justify-between mt-2"><span>Taxe estimée</span><span>Non calculée</span></div>
                  <div className="flex justify-between mt-4 font-semibold text-lg"><span>Total</span><span>{(computePrice(products.find((x) => x.id === productId)?.priceCents || 0)/100).toFixed(2)} €</span></div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="btn-primary" disabled={loading}>{loading ? "Procédure…" : "Créer la commande"}</button>
                <button type="button" className="btn-ghost" onClick={() => { setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setOptOptimisation(false); setOptWifi(false); }}>Réinitialiser</button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="section-contrast p-4 mb-4">
            <h4 className="font-semibold mb-2">Client</h4>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input mb-2" placeholder="Rechercher ou créer un client" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Prénom</label>
              <input className="input mb-2" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Nom</label>
              <input className="input mb-2" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Téléphone</label>
              <input className="input mb-2" type="tel" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="mt-2">
              <label className="block text-sm mb-1">Adresse</label>
              <AddressAutocomplete value={address} onChange={(v, parsed) => { setAddress(v); if (parsed?.postcode) setZip(parsed.postcode); if (parsed?.city) setCity(parsed.city); }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input className="input" placeholder="Code postal" value={zip} onChange={(e) => setZip(e.target.value)} />
              <input className="input" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="section-contrast p-4 mb-4">
            <h4 className="font-semibold mb-2">Notes</h4>
            <div className="text-white/60">Aucune note</div>
          </div>

          <div className="section-contrast p-4">
            <h4 className="font-semibold mb-2">Markets</h4>
            <div className="text-white/60">France</div>
            <div className="mt-2">
              <select className="input"><option>Euro (EUR €)</option></select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
