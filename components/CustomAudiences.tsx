import Image from "next/image";
import Link from "next/link";
import { loadSiteImages } from "@/lib/site-images-server";

const audiences = [
  { slot: "audience-business", title: "Businesses", text: "Bring your brand to work." },
  { slot: "audience-schools", title: "Schools", text: "Wear your school spirit." },
  { slot: "audience-teams", title: "Sports teams", text: "One team. A look of your own." },
  { slot: "audience-clubs", title: "Clubs & groups", text: "Show what brings you together." },
  { slot: "audience-hospitality", title: "Restaurants & hospitality", text: "Apparel for the people behind your service." },
  { slot: "audience-events", title: "Events", text: "Make your next gathering your own." },
] as const;

export default async function CustomAudiences() {
  const images = await loadSiteImages();
  return <section aria-labelledby="custom-audiences" className="store-container border-t border-gray-200 py-12 lg:py-16">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Your people. Your identity.</p>
    <h2 id="custom-audiences" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Custom apparel for everyone</h2>
    <p className="mt-4 max-w-2xl leading-7 text-gray-600">Bring your logo, artwork or idea to apparel for the people who make your organization yours.</p>
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {audiences.map(({ slot,title,text },index) => {
        const image = images[slot];
        const audience = slot.replace("audience-","");
        return <Link key={slot} href={`/custom-apparel?audience=${audience}`} aria-label={`Explore custom apparel for ${title.toLowerCase()}`}
          className="group relative flex aspect-[3/2] min-h-64 w-full min-w-0 flex-col justify-end overflow-hidden rounded-xl bg-stone-200 p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:p-8">
          {image ? <><Image src={image.url} alt={image.alt} fill sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" /></>
            : <span aria-hidden="true" className="absolute right-6 top-4 text-8xl font-semibold tracking-tighter text-stone-300">0{index+1}</span>}
          <div className={`relative ${image ? "text-white" : "text-stone-900"}`}>
            <p className="text-sm">{text}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
            <span className="mt-5 inline-block text-sm font-medium underline underline-offset-4">Explore custom apparel <span aria-hidden="true">→</span></span>
          </div>
        </Link>;
      })}
    </div>
  </section>;
}
