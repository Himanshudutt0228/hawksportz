import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductSearchForm from "@/components/ProductSearchForm";
import DismissibleNotice from "@/components/DismissibleNotice";
import { supabase } from "@/lib/supabase";
import { productViewImages } from "@/lib/design";
import { parseProductSearch, productSearchPattern, productSearchHref, searchPageSize } from "@/lib/product-search";

export const metadata = { title: "Search products | Hawk Sportz", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { query, page, error: inputError } = parseProductSearch(await searchParams);
  let products: { id: string | number; name: string; price: number | string; slug: string | null;
    image_url: string | null; design_images: unknown }[] = [];
  let failed = false;
  if (query && !inputError) {
    try {
      const start = (page - 1) * searchPageSize;
      const result = await supabase.from("products")
        .select("id,name,price,slug,image_url,design_images")
        .ilike("name", productSearchPattern(query))
        .order("id").range(start, start + searchPageSize);
      failed = !!result.error;
      products = result.data ?? [];
    } catch { failed = true; }
  }
  const visible = products.slice(0, searchPageSize);
  const hasNext = products.length > searchPageSize && page < 999;
  return <main className="mobile-content store-container py-12">
    <h1 className="text-4xl font-bold">Search products</h1>
    <p className="mt-4 text-gray-600">Find products by name. You can enter all or part of a name.</p>
    <ProductSearchForm query={query} label="Search products" className="mt-6 max-w-xl" />
    <Link href="/product" className="mt-4 inline-block text-sm underline">Browse all categories</Link>
    {inputError ? <DismissibleNotice tone="error" className="mt-8">{inputError}</DismissibleNotice>
      : !query ? <p className="mt-8 text-gray-600">Enter a product name to start searching.</p>
      : failed ? <DismissibleNotice tone="error" className="mt-8">Unable to search products right now. Please try again shortly.</DismissibleNotice>
      : <>
        <h2 className="mt-8 break-words text-xl font-semibold">Results for “{query}”</h2>
        {visible.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(product => <ProductCard key={product.id} name={product.name} price={`CA$${Number(product.price).toFixed(2)}`}
            slug={product.slug} imageUrl={productViewImages(product).front ?? null} />)}
        </div> : <p className="mt-4 text-gray-600">{page > 1 ? "No products on this page. Try the first page or another search." : "No products found. Try another name or browse our categories."}</p>}
        {(page > 1 || hasNext) && <nav aria-label="Search results pages" className="mt-8 flex flex-wrap items-center gap-5">
          {page > 1 && <Link href={productSearchHref(query, page - 1)} className="underline">Previous</Link>}
          <span>Page {page}</span>
          {hasNext && <Link href={productSearchHref(query, page + 1)} className="underline">Next</Link>}
          {page > 1 && <Link href={productSearchHref(query)} className="underline">First page</Link>}
        </nav>}
      </>}
  </main>;
}
