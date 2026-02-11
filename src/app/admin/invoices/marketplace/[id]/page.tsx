import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function MpInvoiceEdit({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") return <div className="p-6">Interdit</div>;
  const { id } = await params;
  const numId = Number(id);
  const o = await prisma.marketplaceOrder.findUnique({ where: { id: numId }, include: { listing: true, buyer: true } });
  if (!o) return <div className="p-6">Introuvable</div>;
  const any: any = o as any;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Modifier reçu Marketplace #{o.id}</h1>
      <form action={`/api/admin/invoices/marketplace/${o.id}`} method="post" className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nom du client</label>
          <input name="invoiceCustomerName" defaultValue={any.invoiceCustomerName || o.buyer?.name || o.buyer?.email || ''} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notes</label>
          <textarea name="invoiceNotes" defaultValue={any.invoiceNotes || ''} className="textarea textarea-bordered w-full" rows={4} />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn">Enregistrer</button>
          <a className="btn btn-ghost" href={`/api/admin/invoices/marketplace/${o.id}/pdf`} target="_blank">Aperçu PDF</a>
        </div>
      </form>
    </div>
  );
}
