import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import Benefits from "@/components/Benefits";
import ShopCategories from "@/components/ShopCategories";
import CustomAudiences from "@/components/CustomAudiences";
export default function Home() {
  return (
    <main>
      <Hero />
      <section aria-labelledby="shop-categories" className="store-container py-12 lg:py-16">
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Find your fit</p>
          <h2 id="shop-categories" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Shop by category</h2></div>
        <ShopCategories />
      </section>
      <FeaturedProducts />
      <CustomAudiences />
      <Benefits />
    </main>
  );
}
