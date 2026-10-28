import ShopCategories from "@/components/ShopCategories";
import Link from "next/link";

export default function ProductsPage() {
  return (
    <main className="store-container py-12 lg:py-16">
      <h1 className="text-4xl font-bold">Shop by category</h1>
      <p className="mt-4 text-gray-600">Explore ready-made apparel and equipment, collection by collection.</p>
      <div className="mt-8"><ShopCategories /></div>
      <div className="mt-8 flex flex-wrap gap-4">{["Beanies","Hats","Sweatshirts"].map(name=><Link key={name} href={`/${name.toLowerCase()}`} className="rounded-lg border border-gray-200 px-6 py-4 font-semibold hover:border-brand">{name}</Link>)}</div>
    </main>
  );
}
