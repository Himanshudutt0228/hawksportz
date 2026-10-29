import Image from "next/image";
import Link from "next/link";
import { loadSiteImages } from "@/lib/site-images-server";

const categories = [
  { slot:"tshirts",href:"/tshirts",name:"T-Shirts",description:"Everyday essentials" },
  { slot:"hoodies",href:"/hoodies",name:"Hoodies",description:"Comfort, your way" },
  { slot:"jerseys",href:"/jerseys",name:"Jerseys",description:"For your team" },
  { slot:"hats",href:"/hats",name:"Hats",description:"Top off your look" },
  { slot:"beanies",href:"/beanies",name:"Beanies",description:"Stay warm in style" },
  { slot:"sweatshirts",href:"/sweatshirts",name:"Sweatshirts",description:"Comfort for every day" },
  { slot:"equipment",href:"/equipment",name:"Equipment",description:"Get game ready" },
  { slot:"design-your-own",href:"/custom-apparel",name:"Design Your Own",description:"Make your apparel yours" },
] as const;

export default async function ShopCategories({ showArrows = true }: { showArrows?: boolean } = {}) {
  const images = await loadSiteImages();
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
    {categories.map(({ slot,href,name,description }) => <Link key={slot} href={href} aria-label={name} className="group min-w-0">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-stone-100">
        {images[slot] ? <Image src={images[slot].url} alt={images[slot].alt} fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
          : <span aria-hidden="true" className="px-4 text-center text-2xl font-semibold tracking-tight text-stone-400 sm:text-4xl">{name}</span>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2"><h3 className="text-base font-semibold sm:text-xl">{name}</h3>{showArrows && <span aria-hidden="true" className="text-lg">↗</span>}</div>
      <p className="mt-1 text-xs text-gray-500 sm:text-sm">{description}</p>
    </Link>)}
  </div>;
}
