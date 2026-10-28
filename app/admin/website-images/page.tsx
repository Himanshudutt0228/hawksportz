import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { siteImageSlots, siteImageBucket, validSiteImagePath, type SiteImageSlot } from "@/lib/site-images";
import DismissibleNotice from "@/components/DismissibleNotice";
import ImageForm from "./ImageForm";

export const metadata = { title:"Website images | Hawk Sportz",robots:{ index:false,follow:false } };
export const dynamic = "force-dynamic";
export default async function WebsiteImagesPage() {
  const { supabase } = await requireAdmin();
  const { data,error } = await supabase.from("store_site_images").select("slot,image_path,alt_text,version");
  const missingSlots=(Object.keys(siteImageSlots) as SiteImageSlot[]).filter(slot=>!data?.some(row=>row.slot===slot));
  const missingLabels=missingSlots.map(slot=>siteImageSlots[slot].label);
  const missingAudienceSlots=missingSlots.some(slot=>slot.startsWith("audience-"));
  const missingShopSlots=missingSlots.some(slot=>["hats","beanies","sweatshirts","design-your-own"].includes(slot));
  return <main className="mx-auto w-full max-w-6xl px-5 py-12">
    <Link href="/admin" className="text-sm underline">Back to Admin</Link>
    <h1 className="mt-6 text-3xl font-semibold">Website images</h1>
    <p className="mt-3 max-w-3xl leading-7 text-gray-600">Change homepage, collection and page images here. Use still PNG, JPEG or WebP files up to 5 MB and 16 megapixels. Changes appear on the website after saving.</p>
    <p className="mt-3 text-sm text-gray-600">For product photos, including the apparel designer views, use <Link href="/admin" className="underline">Products → Edit → Product photos</Link>. Customer artwork is separate.</p>
    {error ? <DismissibleNotice tone="error" className="mt-8">Website image setup is incomplete. Apply the website image database script, then refresh this page.</DismissibleNotice>
      : <>
      {missingSlots.length>0 && <DismissibleNotice tone="error" className="mt-8">Missing image options: {missingLabels.join(", ")}. {missingAudienceSlots&&<>Run <code>custom-apparel-cards.sql</code> first. </>}{missingShopSlots&&<>Then run <code>shop-category-images.sql</code>. </>}Refresh this page after the scripts finish. Existing image controls below still work.</DismissibleNotice>}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">{(Object.keys(siteImageSlots) as SiteImageSlot[]).map(slot => {
        const row = data?.find(image => image.slot===slot);
        if (!row) return null;
        const url = validSiteImagePath(slot,row.image_path) ? supabase.storage.from(siteImageBucket).getPublicUrl(row.image_path).data.publicUrl : null;
        return <ImageForm key={slot} slot={slot} version={Number(row.version)} url={url} alt={row.alt_text} />;
      })}</div></>}
  </main>;
}
