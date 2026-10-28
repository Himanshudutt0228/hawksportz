"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prepareProductPhoto as prepareSitePhoto } from "@/lib/product-photo-upload";
import { isSiteImageSlot, siteImageBucket, type SiteImageState } from "@/lib/site-images";

export async function saveSiteImage(slot: string, expectedVersion: number, _: SiteImageState, form: FormData): Promise<SiteImageState> {
  const { supabase } = await requireAdmin();
  if (!isSiteImageSlot(slot) || !Number.isSafeInteger(expectedVersion) || expectedVersion<0) return { error: "Invalid image selection. Refresh the page." };
  const remove = form.get("intent") === "remove";
  if (remove && form.get("confirm_remove") !== "yes") return { error: "Confirm removal before saving." };
  const alt = form.get("alt_text");
  if (!remove && (typeof alt !== "string" || !alt.trim() || alt.length>160 || /[\u0000-\u001f\u007f]/.test(alt))) {
    return { error: "Describe the image using 1–160 characters." };
  }
  try {
    const current = await supabase.from("store_site_images").select("image_path,version").eq("slot",slot).maybeSingle();
    if (current.error || !current.data) return { error: "Unable to load this image. Check website image setup and your admin access." };
    if (Number(current.data.version)!==expectedVersion) return { error: "This image changed. Refresh before saving again." };
    let path: string | null = remove ? null : current.data.image_path;
    if (!remove) {
      const file = form.get("image");
      if (file !== null && !(file instanceof File)) return { error: "Choose an image using the upload field." };
      if (file instanceof File && file.size>0) {
        let body: Buffer;
        try { body = await prepareSitePhoto(file); }
        catch { return { error: "Use a still PNG, JPEG or WebP image up to 5 MB and 16 megapixels." }; }
        path = `site/${slot}/${randomUUID()}.webp`;
        const upload = await supabase.storage.from(siteImageBucket).upload(path,body,{
          contentType:"image/webp",upsert:false,cacheControl:"31536000",
        });
        if (upload.error) return { error: "Image upload failed. Check storage setup and your admin access." };
      }
      if (!path) return { error: "Choose an image before saving." };
    }
    // Database independently checks confirmed membership, version and stored path.
    const saved = await supabase.rpc("store_admin_set_site_image", {
      p_slot:slot,p_expected_version:expectedVersion,p_path:path,p_alt:remove ? "" : (alt as string).trim(),
    });
    if (saved.error) return { error: "Unable to confirm the save. Refresh to check the image and your access before retrying." };
  } catch {
    // Preserve uploads after uncertain commits; do not log provider details.
    return { error: "Unable to confirm the save. Refresh to check the image before retrying." };
  }
  revalidatePath("/","layout");
  return { message: remove ? "Image removed from the website." : "Website image saved." };
}
