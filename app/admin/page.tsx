import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import DismissibleNotice from "@/components/DismissibleNotice";

export const metadata = { title: "Admin | Hawk Sportz" };

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[]; deleted?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { page: requestedPage, deleted } = await searchParams;
  const parsedPage = typeof requestedPage === "string" && /^[1-9]\d{0,5}$/.test(requestedPage)
    ? Number(requestedPage) : 1;
  const pageSize = 25;
  const start = (parsedPage - 1) * pageSize;
  // Use the current user's database permissions after verifying admin membership.
  // Fetch one extra row to determine whether there is another page.
  const { data, error } = await supabase.from("products")
    .select("id,name,slug,category,price,stock")
    .order("id").range(start, start + pageSize);
  const products = error ? [] : (data ?? []).slice(0, pageSize);
  const hasNextPage = !error && (data?.length ?? 0) > pageSize;
  const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
  return <main className="mobile-content mx-auto w-full max-w-5xl px-5 py-12">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">Hawk Sportz</p>
        <h1 className="mt-2 text-3xl font-semibold">Admin dashboard</h1>
      </div>
      <Link href="/account" className="text-sm underline">Your account</Link>
    </div>
    {deleted === "1" && <DismissibleNotice tone="success" className="mt-6">Product deleted.</DismissibleNotice>}
    <section className="mt-8 rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-medium">Website appearance</h2>
      <p className="mt-2 text-sm text-gray-600">Change homepage, collection, About and custom-apparel images.</p>
      <Link href="/admin/website-images" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">Website images</Link>
    </section>
    <section className="mt-8 rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-medium">Orders</h2>
      <p className="mt-2 text-sm text-gray-600">View paid sandbox orders and manage delivery or pickup status.</p>
      <Link href="/admin/orders" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">Manage orders</Link>
    </section>
    <section className="mt-8 rounded-xl border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-medium">Products</h2>
        <Link href="/admin/products/new" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">New product</Link>
      </div>
      <p className="mt-2 text-sm text-gray-600">Review your catalog, prices in CAD, and available stock.</p>
      {error ? <DismissibleNotice tone="error" className="mt-6">
        Unable to load products. Please try again shortly.
      </DismissibleNotice> : products.length ? <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Store products, page {parsedPage}</caption>
          <thead className="border-b border-gray-200 text-gray-600">
            <tr>{["Product", "Category", "Price (CAD)", "Stock", "Storefront", "Manage"].map(label =>
              <th key={label} scope="col" className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr>
          </thead>
          <tbody>{products.map(product => <tr key={product.id} className="border-b border-gray-100">
            <th scope="row" className="min-w-40 px-3 py-4 font-medium">{product.name || "Unnamed product"}</th>
            <td className="px-3 py-4">{product.category || "Uncategorized"}</td>
            <td className="whitespace-nowrap px-3 py-4">{product.price !== null && Number.isFinite(Number(product.price))
              ? currency.format(Number(product.price)) : "Not set"}</td>
            <td className="whitespace-nowrap px-3 py-4">{product.stock ?? "Not set"}</td>
            <td className="px-3 py-4">{product.slug ? <Link
              href={`/product/${encodeURIComponent(product.slug)}`} className="underline"
              aria-label={`View ${product.name || "product"} in storefront`}>View</Link> : "Unavailable"}</td>
            <td className="px-3 py-4"><Link href={`/admin/products/${encodeURIComponent(String(product.id))}`}
              className="underline" aria-label={`Edit ${product.name || "product"}`}>Edit</Link></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="mt-6 text-gray-600">{parsedPage === 1
        ? "No products yet." : "No products on this page."}</p>}
      {!error && <nav aria-label="Product pages" className="mt-6 flex items-center gap-5 text-sm">
        {parsedPage > 1 && <Link href={`/admin?page=${parsedPage - 1}`} className="underline">Previous</Link>}
        <span>Page {parsedPage}</span>
        {hasNextPage && <Link href={`/admin?page=${parsedPage + 1}`} className="underline">Next</Link>}
      </nav>}
      <Link href="/product" className="mt-6 inline-block text-sm underline">View storefront products</Link>
    </section>
  </main>;
}
