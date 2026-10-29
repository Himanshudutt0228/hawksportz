import Image from "next/image";
import Link from "next/link";
import MobileNavigation from "@/components/MobileNavigation";
import CartLink from "@/components/CartLink";
import NavigationDropdown from "@/components/NavigationDropdown";
import ProductSearchForm from "@/components/ProductSearchForm";

export default function Header() {
  return (
    <>
      {/* Top header */}
      <header className="border-b border-gray-200 bg-white text-ink md:border-ink md:bg-ink md:text-white">
        <div className="store-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-3 md:gap-x-6 md:gap-y-4 md:grid-cols-[1fr_minmax(280px,1.4fr)_1fr] md:py-5">

          {/* Hawk Sportz Logo */}
          <div className="flex min-w-0 items-center gap-2">
            <MobileNavigation />

            <Link href="/" aria-label="Hawk Sportz home">
              <Image
                src="/hawksportz-logo.png"
                alt="Hawk Sportz"
                width={180}
                height={70}
                className="h-12 w-auto object-contain md:h-16"
                priority
              />
            </Link>
          </div>

          <ProductSearchForm className="order-last col-span-2 md:order-none md:col-span-1" />

          <div className="flex items-center justify-end gap-1 text-sm font-medium md:gap-2">
            <Link
              href="/account"
              aria-label="Account"
              className="header-action flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 md:border-white/25 md:bg-white/5 md:px-3"
            >
              <svg
                className="shrink-0"
                viewBox="0 0 24 24"
                width="23"
                height="23"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
              </svg>

              <span className="hidden md:inline">Account</span>
            </Link>

            <CartLink />
          </div>
        </div>
      </header>

      {/* Main navigation */}
      <nav
        aria-label="Main navigation"
        className="relative z-50 hidden border-b border-gray-200 bg-gray-50 md:block"
      >
        <div className="store-container flex flex-wrap items-center justify-start gap-2 py-3 text-center text-sm font-medium text-gray-600 lg:gap-3">
          <Link href="/product" className="nav-button">
            Shop Ready-Made
          </Link>

          <Link
            href="/custom-apparel"
            className="nav-button nav-button-primary"
          >
            Custom Apparel
          </Link>

          <NavigationDropdown
            label="T-Shirts"
            href="/tshirts"
            items={[
              {
                label: "Short Sleeve",
                href: "/tshirts?style=short-sleeve",
              },
              {
                label: "Long Sleeve",
                href: "/tshirts?style=long-sleeve",
              },
            ]}
          />

          <NavigationDropdown
            label="Hoodies"
            href="/hoodies"
            items={[
              {
                label: "Pullover",
                href: "/hoodies?style=pullover",
              },
              {
                label: "Zip-Up",
                href: "/hoodies?style=zip-up",
              },
            ]}
          />

          <Link href="/beanies" className="nav-button">
            Beanies
          </Link>

          <Link href="/hats" className="nav-button">
            Hats
          </Link>

          <Link href="/sweatshirts" className="nav-button">
            Sweatshirts
          </Link>

          <NavigationDropdown
            label="Jerseys"
            href="/jerseys"
            items={[
              {
                label: "Short Sleeve",
                href: "/jerseys?style=short-sleeve",
              },
              {
                label: "Long Sleeve",
                href: "/jerseys?style=long-sleeve",
              },
            ]}
          />

          <Link href="/equipment" className="nav-button">
            Equipment
          </Link>
        </div>
      </nav>
    </>
  );
}
