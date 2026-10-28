import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { isSiteImageSlot, validSiteImagePath, siteImageBucket, type SiteImage, type SiteImageSlot } from "./site-images";

// Request-local sharing only: saves appear on the next public page request.
export const loadSiteImages = cache(async (): Promise<Partial<Record<SiteImageSlot, SiteImage>>> => {
  try {
    const { data, error } = await supabase.from("store_site_images").select("slot,image_path,alt_text");
    if (error) return {};
    const images: Partial<Record<SiteImageSlot, SiteImage>> = {};
    for (const row of data ?? []) {
      if (!isSiteImageSlot(row.slot) || !validSiteImagePath(row.slot, row.image_path) || typeof row.alt_text !== "string") continue;
      images[row.slot] = { url: supabase.storage.from(siteImageBucket).getPublicUrl(row.image_path).data.publicUrl, alt: row.alt_text };
    }
    return images;
  } catch { return {}; }
});
