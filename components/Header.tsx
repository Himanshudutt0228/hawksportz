import Link from "next/link";
import CartLink from "@/components/CartLink";
import NavigationDropdown from "@/components/NavigationDropdown";
import ProductSearchForm from "@/components/ProductSearchForm";
export default function Header() {
  return (
    <>
      {/* Top header */}
      <header className="border-b border-ink bg-ink text-white">
        <div className="store-container grid grid-cols-2 items-center gap-x-6 gap-y-4 py-4 md:grid-cols-[1fr_minmax(280px,1.4fr)_1fr] md:py-5">
          <Link href="/" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Hawk Sportz
          </Link>

          <ProductSearchForm className="order-last col-span-2 md:order-none md:col-span-1" />

          <div className="flex items-center justify-end gap-6 text-sm font-medium text-white">
            <Link href="/account">Account</Link>
            <CartLink />
          </div>
        </div>
      </header>

      {/* Main navigation */}
      <nav
        aria-label="Main navigation"
        className="relative z-50 border-b border-gray-200 bg-gray-50"
      >
        <div className="store-container flex flex-wrap items-center justify-start gap-2 py-3 text-center text-sm font-medium text-gray-600 sm:gap-5">
          <Link href="/product" className="px-2 py-1 hover:underline">Shop Ready-Made</Link>
          <Link href="/custom-apparel" className="px-2 py-1 hover:underline">Custom Apparel</Link>
          <NavigationDropdown label="T-Shirts" href="/tshirts" items={[{label:"Short Sleeve",href:"/tshirts?style=short-sleeve"},{label:"Long Sleeve",href:"/tshirts?style=long-sleeve"}]} />
          <NavigationDropdown label="Hoodies" href="/hoodies" items={[{label:"Pullover",href:"/hoodies?style=pullover"},{label:"Zip-Up",href:"/hoodies?style=zip-up"}]} />
          <Link href="/beanies" className="px-2 py-3 hover:underline">Beanies</Link>
          <Link href="/hats" className="px-2 py-3 hover:underline">Hats</Link>
          <Link href="/sweatshirts" className="px-2 py-3 hover:underline">Sweatshirts</Link>
          <NavigationDropdown label="Jerseys" href="/jerseys" items={[{label:"Short Sleeve",href:"/jerseys?style=short-sleeve"},{label:"Long Sleeve",href:"/jerseys?style=long-sleeve"}]} />
          <Link href="/equipment" className="px-2 py-3 hover:underline">Equipment</Link>
        </div>
      </nav>
    </>
  );
}

