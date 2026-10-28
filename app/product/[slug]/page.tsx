import ProductGallery from "@/components/ProductGallery";
import ProductPurchase from "@/components/ProductPurchase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { productSizes } from "@/lib/product-sizes";
import { readSizeStock } from "@/lib/product-stock";
import DismissibleNotice from "@/components/DismissibleNotice";
import { productViewImages } from "@/lib/design";

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const { data: product, error } = await supabase
    .from("products").select("*").eq("slug", slug).maybeSingle();

  if (error) {
    return (
      <main className="store-container py-12">
        <h1 className="text-3xl font-bold">Unable to load this product</h1>
        <DismissibleNotice tone="error" className="mt-4">Please try again later.</DismissibleNotice>
        <Link href="/product" className="mt-6 inline-block underline">Back to products</Link>
      </main>
    );
  }
  if (!product) notFound();

  const stock = product.stock == null ? null : Number(product.stock);
  const inStock = stock !== null && Number.isFinite(stock) && stock > 0;
  const sizes = productSizes(product);
  const isClothing = ["tshirts", "hoodies", "jerseys", "beanies", "hats", "sweatshirts"].includes(product.category);

  return (
    <main className="store-container py-12">
      <Link href="/product" className="mb-8 inline-block text-sm underline">Back to products</Link>
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery key={product.id} name={product.name} images={productViewImages(product)} />
        <div className="min-w-0 lg:pl-6">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <p className="mt-4 text-2xl">${Number(product.price).toFixed(2)}</p>
          <p className="mt-6 whitespace-pre-line text-gray-600">{product.description}</p>
          <p className="mt-4 text-sm font-medium">
            {inStock ? `In stock: ${stock} available` : stock === 0 ? "Out of stock" : "Currently unavailable"}
          </p>
          <ProductPurchase
            key={product.id}
            product={{ id: String(product.id), slug: product.slug, name: product.name,
              price: Number(product.price), stock: inStock ? Math.floor(stock!) : 0, sizeStock: readSizeStock(product.stock_by_size) }}
            sizes={sizes}
            isClothing={isClothing}
          />
        </div>
      </div>
    </main>
  );
}

