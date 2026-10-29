import ShopCategories from "@/components/ShopCategories";

export default function ProductsPage() {
  return (
    <main className="mobile-content store-container py-12 lg:py-16">
      <h1 className="text-4xl font-bold">Shop by category</h1>
      <p className="mt-4 text-gray-600">Explore ready-made apparel and equipment, collection by collection.</p>
      <div className="mt-8"><ShopCategories showArrows={false} /></div>
    </main>
  );
}
