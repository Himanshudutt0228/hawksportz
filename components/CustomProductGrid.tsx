import Image from "next/image";
import Link from "next/link";
import type { DesignProduct } from "@/lib/design";
import {customPricingForCategory} from "@/lib/print-pricing";

export default function CustomProductGrid({products,audience}:{products:DesignProduct[];audience:string|null}) {
  return <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
    {products.map(product=>{
      const pricing=customPricingForCategory(product.category,product.price);
      const params=new URLSearchParams({product:product.id,...(audience?{audience}:{})});
      return <article key={product.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 sm:p-4">
        <Link href={`/custom-apparel?${params}`} aria-label={`Customize ${product.name}`} className="group block">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
            {product.imageUrl?<Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw" className="object-contain transition-transform group-hover:scale-105 motion-reduce:transform-none" />
              :<span className="flex h-full items-center justify-center text-sm text-gray-500">Photo unavailable</span>}
          </div>
          <h3 className="mt-3 break-words text-sm font-semibold sm:mt-4 sm:text-lg">{product.name}</h3>
          <p className="mt-2 text-xs text-gray-600 sm:text-sm">{pricing?`Base CA$${(pricing.baseCents/100).toFixed(2)} + printing`:"Base price awaiting confirmation"}</p>
          <p className="mt-2 text-xs text-gray-500">{product.sizes.length?`Sizes: ${product.sizes.join(', ')}`:'Sizes not yet listed'}</p>
          {!product.stock&&<p className="mt-2 text-xs text-gray-500">Currently out of stock</p>}
          <span className="mt-4 block min-h-11 rounded-lg bg-brand px-2 py-3 sm:px-4 text-center text-sm font-medium text-on-brand">Customize</span>
        </Link>
      </article>;
    })}
  </div>;
}
