import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { productViewImages } from "@/lib/design";
import ProductCarousel from "@/components/ProductCarousel";

export default async function FeaturedProducts() {
  // Page through public catalogue rows so the database's response limit cannot
  // silently restrict this carousel to the first batch of products.
  const products: {id:string|number;name:string;price:number|string;slug:string|null;image_url?:unknown;design_images?:unknown}[]=[];
  let error=false;
  const pageSize=200;
  for(let start=0;;start+=pageSize){
    const result=await supabase.from("products").select("id,name,price,slug,image_url,design_images").order("id").range(start,start+pageSize-1);
    if(result.error){error=true;break;}
    products.push(...(result.data??[]));
    if((result.data?.length??0)<pageSize)break;
  }

  return (
    <section
      aria-labelledby="featured-products"
      className="store-container border-t border-gray-200 py-12 lg:py-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-4"><h2
        id="featured-products"
        className="text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Featured Products
      </h2>
      <Link href="/product" className="text-sm font-medium underline underline-offset-4">Explore all collections →</Link></div>

      {error ? (
        <p className="mt-6 text-gray-600">
          Unable to load products right now.
        </p>
      ) : products?.length ? (
        <ProductCarousel count={products.length}>
          {products.map((product) => (
            <div key={product.id}><ProductCard
              name={product.name}
              price={`$${Number(product.price).toFixed(2)}`}
              slug={product.slug}
              imageUrl={productViewImages(product).front ?? null}
            /></div>
          ))}
        </ProductCarousel>
      ) : (
        <p className="mt-6 text-gray-600">Products coming soon.</p>
      )}
    </section>
  );
}
