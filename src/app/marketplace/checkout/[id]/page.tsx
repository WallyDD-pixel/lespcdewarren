import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) redirect("/marketplace");
  redirect(`/checkout?listingId=${encodeURIComponent(id)}`);
}
