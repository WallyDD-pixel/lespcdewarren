import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") {
    return <div className="p-6">Interdit</div>;
  }

  const [store, mp] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.marketplaceOrder.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { listing: true, buyer: true, seller: true } }),
  ]);

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-xl font-semibold">Factures</h1>
      <section>
        <h2 className="text-lg font-medium mb-2">Boutique</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Montant</th>
                <th className="py-2 pr-4">Facture</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {store.map(o => {
                const inv = (o as any).invoiceNumber as string | null;
                return (
                  <tr key={`s-${o.id}`} className="border-t border-white/10">
                    <td className="py-2 pr-4">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="py-2 pr-4">{o.email}</td>
                    <td className="py-2 pr-4">{(o.amountCents/100).toFixed(2)} {o.currency}</td>
                    <td className="py-2 pr-4">{inv || <span className="text-white/60">—</span>}</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <a className="btn btn-sm" href={`/api/admin/invoices/store/${o.id}/pdf`} target="_blank">Aperçu PDF</a>
                      <a className="btn btn-sm btn-ghost" href={`/admin/invoices/store/${o.id}`}>Modifier</a>
                      <form action={`/api/admin/invoices/store/${o.id}/resend`} method="post" className="inline">
                        <button className="btn btn-sm" type="submit">Renvoyer facture</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Marketplace</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Acheteur</th>
                <th className="py-2 pr-4">Montant</th>
                <th className="py-2 pr-4">Facture</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {mp.map(o => {
                const inv = (o as any).invoiceNumber as string | null;
                return (
                  <tr key={`m-${o.id}`} className="border-t border-white/10">
                    <td className="py-2 pr-4">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="py-2 pr-4">{o.buyer?.email || o.buyerId}</td>
                    <td className="py-2 pr-4">{(o.amountCents/100).toFixed(2)} {o.currency}</td>
                    <td className="py-2 pr-4">{inv || <span className="text-white/60">—</span>}</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <a className="btn btn-sm" href={`/api/admin/invoices/marketplace/${o.id}/pdf`} target="_blank">Aperçu PDF</a>
                      <a className="btn btn-sm btn-ghost" href={`/admin/invoices/marketplace/${o.id}`}>Modifier</a>
                      <form action={`/api/admin/invoices/marketplace/${o.id}/resend`} method="post" className="inline">
                        <button className="btn btn-sm" type="submit">Renvoyer facture</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
