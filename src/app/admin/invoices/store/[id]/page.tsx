import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function StoreInvoiceEdit({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") return <div className="p-6">Interdit</div>;
  const { id } = await params;
  const numId = Number(id);
  const o = await prisma.order.findUnique({ where: { id: numId } });
  if (!o) return <div className="p-6">Introuvable</div>;
  const any: any = o as any;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Modifier facture Boutique #{o.id}</h1>
      <form action={`/api/admin/invoices/store/${o.id}`} method="post" className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nom du client</label>
          <input name="invoiceCustomerName" defaultValue={any.invoiceCustomerName || o.shippingName || o.email} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Adresse</label>
          <input name="invoiceCustomerAddr1" defaultValue={any.invoiceCustomerAddr1 || o.shippingAddr1 || ''} className="input input-bordered w-full" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm mb-1">Code postal</label>
            <input name="invoiceCustomerZip" defaultValue={any.invoiceCustomerZip || o.shippingZip || ''} className="input input-bordered w-full" />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Ville</label>
            <input name="invoiceCustomerCity" defaultValue={any.invoiceCustomerCity || o.shippingCity || ''} className="input input-bordered w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Notes</label>
          <textarea name="invoiceNotes" defaultValue={any.invoiceNotes || ''} className="textarea textarea-bordered w-full" rows={4} />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn">Enregistrer</button>
          <a className="btn btn-ghost" href={`/api/admin/invoices/store/${o.id}/pdf`} target="_blank">Aperçu PDF</a>
        </div>
      </form>
    </div>
  );
}
