import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { productViewImages } from "@/lib/design";
import DismissibleNotice from "@/components/DismissibleNotice";
import Image from "next/image";
import { loadSiteImages } from "@/lib/site-images-server";
import {isSiteImageSlot} from "@/lib/site-images";

type CategoryProductsProps = {
  category: "tshirts" | "hoodies" | "jerseys" | "equipment" | "beanies" | "hats" | "sweatshirts";
  title: string;
  description: string;
  style?:string;
};

export default async function CategoryProducts({
  category,
  title,
  description,
  style,
}: CategoryProductsProps) {
  const images=await loadSiteImages();
  const cover = isSiteImageSlot(category)?images[category]:undefined;
  const { data, error } = await supabase.from("products").select("*").eq("category",category).order("id");
  const products=style?(data??[]).filter(product=>product.garment_style===style):data;

  return (
    <main className="store-container py-12">
      {cover && <div className="relative mb-8 h-56 overflow-hidden rounded-xl sm:h-72"><Image src={cover.url} alt={cover.alt} fill sizes="100vw" className="object-cover" /></div>}
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-4 text-gray-600">{description}</p>

      {error ? (
        <DismissibleNotice tone="error" className="mt-10">
          Unable to load products right now. Please try again later.
        </DismissibleNotice>
      ) : products?.length ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              price={`$${Number(product.price).toFixed(2)}`}
              slug={product.slug}
              imageUrl={productViewImages(product).front ?? null}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-gray-600">
          No products in this collection yet. Check back soon.
        </p>
      )}
    </main>
  );
}
