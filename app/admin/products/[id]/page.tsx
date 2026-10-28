import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validProductId } from "@/lib/admin-product";
import ProductEditForm from "./ProductEditForm";
import ProductImagesForm from "./ProductImagesForm";
import { productViewImages } from "@/lib/design";
import { productSizes } from "@/lib/product-sizes";
import { readSizeStock } from "@/lib/product-stock";
import ProductDesignerForm from "./ProductDesignerForm";
import DeleteProductForm from "./DeleteProductForm";
import DismissibleNotice from "@/components/DismissibleNotice";

export const metadata = { title: "Edit product | Hawk Sportz" };

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  if (!validProductId(id)) notFound();
  const { data: product, error } = await supabase.from("products")
    .select("*").eq("id", id).maybeSingle();
  if (!error && !product) notFound();
  return <main className="mx-auto w-full max-w-2xl px-5 py-12">
    <Link href="/admin" className="text-sm underline">Back to products</Link>
    <h1 className="mt-6 text-3xl font-semibold">Edit product</h1>
    {created === "1" && product && <DismissibleNotice tone="success" className="mt-4">Product created.</DismissibleNotice>}
    {error || !product ? <DismissibleNotice tone="error" className="mt-6">Unable to load this product. Please try again shortly.</DismissibleNotice> :
      <><ProductEditForm product={{ id: String(product.id), name: product.name ?? "", description: product.description ?? "",
        price: product.price == null ? "" : String(product.price), stock: product.stock == null ? "" : String(product.stock),
        sizes: productSizes(product), sizeStock: readSizeStock(product.stock_by_size), category: product.category, garmentStyle: product.garment_style }} />
        {["tshirts", "hoodies", "jerseys", "hats", "beanies", "sweatshirts"].includes(product.category) &&
          <ProductDesignerForm id={String(product.id)} enabled={product.customizable !== false} audiences={Array.isArray(product.custom_audiences)?product.custom_audiences:[]} />}
        <ProductImagesForm id={String(product.id)} images={productViewImages(product)} />
        <DeleteProductForm id={String(product.id)} name={product.name || "Unnamed product"} /></>}
  </main>;
}
