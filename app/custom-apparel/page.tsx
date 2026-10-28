import type { Metadata } from "next";
import DesignStudio from "@/components/designer/DesignStudio";
import { supabase } from "@/lib/supabase";
import { productSizes } from "@/lib/product-sizes";
import { productColours, productViewImages } from "@/lib/design";
import { readSizeStock } from "@/lib/product-stock";
import DismissibleNotice from "@/components/DismissibleNotice";
import Image from "next/image";
import { loadSiteImages } from "@/lib/site-images-server";
import Link from "next/link";
import { customAudiences,isCustomAudience } from "@/lib/custom-audiences";
import CustomProductGrid from "@/components/CustomProductGrid";
import ResumeDesignLink from "@/components/designer/ResumeDesignLink";
import { validProductId } from "@/lib/admin-product";

export const metadata: Metadata = {
  title: "Custom Apparel | Hawk Sportz",
  description: "Design custom apparel with your artwork and text, then choose sizes and quantities.",
};

export default async function CustomApparelPage({searchParams}:{searchParams:Promise<{audience?:string|string[];product?:string|string[];design?:string|string[];resume?:string|string[]}>}) {
  const {audience,product:requestedProduct,design,resume} = await searchParams;
  const selectedAudience = isCustomAudience(audience)?audience:null;
  const invalidAudience = audience!==undefined && !selectedAudience;
  const image = (await loadSiteImages())["custom-apparel"];
  let query = supabase.from("products").select("*").in("category", ["tshirts", "hoodies", "jerseys", "hats", "beanies", "sweatshirts"]);
  if(selectedAudience) query=query.contains("custom_audiences",[selectedAudience]);
  const { data, error } = invalidAudience ? {data:null,error:null} : await query.order("id");
  const products = (data ?? []).filter((product) => ["hats","beanies","sweatshirts"].includes(product.category)?product.customizable===true:product.customizable !== false).map((product) => ({
    id: String(product.id), slug: product.slug, name: product.name, category: product.category,
    garmentStyle: product.garment_style??null,
    price: Number(product.price), stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    sizeStock: readSizeStock(product.stock_by_size),
    sizes: productSizes(product), colours: productColours(product), imageUrl: productViewImages(product).front ?? null,
    viewImages: productViewImages(product),
  }));
  const selectedProduct=typeof requestedProduct==="string"&&validProductId(requestedProduct)?products.find(product=>product.id===requestedProduct):undefined;
  const invalidProduct=requestedProduct!==undefined&&!selectedProduct;
  const invalidDesign=design!==undefined&&(typeof design!=="string"||!/^[0-9a-f-]{36}$/i.test(design));
  const showEditor=!!selectedProduct||(!invalidDesign&&typeof design==="string")||resume==="1";
  const catalogHref=selectedAudience?`/custom-apparel?audience=${selectedAudience}`:"/custom-apparel";
  return (
    <main className="store-container py-8">
      {image && <div className="relative mb-8 h-48 overflow-hidden rounded-xl sm:h-72"><Image src={image.url} alt={image.alt} fill sizes="100vw" className="object-cover" /></div>}
      <p className="text-sm font-medium uppercase tracking-widest text-gray-500">For teams, businesses & events</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{showEditor?"Make it yours.":"Choose your custom apparel"}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-gray-600">
        {showEditor?"Upload your artwork, add your text, then choose sizes and quantities.":"Choose a product below to start designing. All custom apparel includes products from every group."}
      </p>
      <nav aria-label="Custom apparel categories" className="my-6 flex flex-wrap gap-2">
        <Link href="/custom-apparel" aria-current={!selectedAudience&&!invalidAudience?"page":undefined} className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm aria-[current=page]:bg-ink aria-[current=page]:text-white">All custom apparel</Link>
        {Object.entries(customAudiences).map(([key,label])=><Link key={key} href={`/custom-apparel?audience=${key}`} aria-current={selectedAudience===key?"page":undefined} className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm aria-[current=page]:bg-ink aria-[current=page]:text-white">{label}</Link>)}
      </nav>
      {selectedAudience && <h2 className="mb-6 text-2xl font-semibold">Custom apparel for {customAudiences[selectedAudience].toLowerCase()}</h2>}
      {invalidAudience ? <DismissibleNotice tone="error">Choose one of the custom apparel categories above.</DismissibleNotice>
        : error ? <DismissibleNotice tone="error" className="mt-8">Unable to load apparel right now. Please try again later.</DismissibleNotice>
        : invalidProduct||invalidDesign?<DismissibleNotice tone="error" className="my-6">This custom product or design link is unavailable. <Link href={catalogHref} className="underline">Choose a product</Link> to continue.</DismissibleNotice>
        : !products.length ? <p className="my-8 text-gray-600">No custom products in this category yet. Browse All custom apparel or choose another category.</p>
        : showEditor?<DesignStudio key={`${selectedAudience??"all"}-${selectedProduct?.id??design??"resume"}`} products={products} initialProductId={selectedProduct?.id} catalogHref={catalogHref} />
        : <><ResumeDesignLink /><CustomProductGrid products={products} audience={selectedAudience} /></>}
    </main>
  );
}
