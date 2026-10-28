export const siteImageSlots = {
  "audience-business": { label: "Custom apparel — Businesses", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "audience-schools": { label: "Custom apparel — Schools", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "audience-teams": { label: "Custom apparel — Sports teams", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "audience-clubs": { label: "Custom apparel — Clubs and groups", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "audience-hospitality": { label: "Custom apparel — Restaurants and hospitality", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "audience-events": { label: "Custom apparel — Events", hint: "Landscape card image, around 1200 × 800 pixels.", href: "/" },
  "home-hero": { label: "Homepage main image", hint: "Landscape image, around 1600 × 1200 pixels.", href: "/" },
  tshirts: { label: "T-shirt collection image", hint: "Square image for collection cards and the T-shirt page.", href: "/tshirts" },
  hoodies: { label: "Hoodie collection image", hint: "Square image for collection cards and the hoodie page.", href: "/hoodies" },
  jerseys: { label: "Jersey collection image", hint: "Square image for collection cards and the jersey page.", href: "/jerseys" },
  hats: { label: "Hat collection image", hint: "Square image for the hats collection.", href: "/hats" },
  beanies: { label: "Beanie collection image", hint: "Square image for the beanies collection.", href: "/beanies" },
  sweatshirts: { label: "Sweatshirts collection image", hint: "Square image for collection cards and the sweatshirt page.", href: "/sweatshirts" },
  equipment: { label: "Equipment collection image", hint: "Square image for collection cards and the equipment page.", href: "/equipment" },
  "custom-apparel": { label: "Design Your Own / Custom Apparel image", hint: "Used on the Design Your Own homepage card and the Custom Apparel page. Choose a wide landscape image.", href: "/custom-apparel" },
  "design-your-own": { label: "Design Your Own card image", hint: "Homepage card image, around 1200 × 800 pixels. Choose any custom apparel artwork or product photo.", href: "/custom-apparel" },
  about: { label: "About page image", hint: "Wide landscape image, around 1600 × 800 pixels.", href: "/about" },
} as const;

export type SiteImageSlot = keyof typeof siteImageSlots;
export type SiteImageState = { error?: string; message?: string };
export type SiteImage = { url: string; alt: string };
export const siteImageBucket = "store-site-images";
export function isSiteImageSlot(value: unknown): value is SiteImageSlot {
  return typeof value === "string" && Object.hasOwn(siteImageSlots, value);
}
export function validSiteImagePath(slot: SiteImageSlot, path: unknown): path is string {
  return typeof path === "string" && new RegExp(`^site/${slot}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$`).test(path);
}
