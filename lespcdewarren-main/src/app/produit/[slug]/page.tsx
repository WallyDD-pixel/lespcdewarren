import { prisma } from "@/lib/prisma";
import ProductDetails, { type ProductDTO } from "@/components/ProductDetails";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: true, variants: true, category: true },
  });

  if (!product) return <div className="mx-auto max-w-6xl p-6">Produit introuvable.</div>;

  const dto: ProductDTO = {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    stock: product.stock,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: product.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents, stock: v.stock })),
    categoryName: product.category?.name,
    specs: (product as any).specs ?? null,
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <ProductDetails product={dto} />
    </main>
  );
}
