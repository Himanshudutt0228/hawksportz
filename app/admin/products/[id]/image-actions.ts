"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { validProductId, type ProductEditState } from "@/lib/admin-product";
import { designSides, productViewImages } from "@/lib/design";
import { prepareProductPhoto } from "@/lib/product-photo-upload";

const bucket = "admin-product-images";

export async function updateProductImages(id: string, _: ProductEditState, form: FormData): Promise<ProductEditState> {
  const { supabase } = await requireAdmin();
  if (!validProductId(id)) return { error: "Invalid product." };
  const { data: product, error: readError } = await supabase.from("products")
    .select("id,image_url,design_images").eq("id", id).maybeSingle();
  if (readError || !product) return { error: "Unable to load product images. Check the image database setup." };
  const existing = productViewImages(product);
  const prepared: { side: typeof designSides[number]; body: Buffer }[] = [];
  try {
    for (const side of designSides) {
      const file = form.get(side);
      if (file instanceof File && file.size === 0) continue;
      if (file === null) continue;
      if (!(file instanceof File)) return { error: "Choose image files using the upload fields." };
      prepared.push({ side, body: await prepareProductPhoto(file) });
    }
  } catch {
    return { error: "A photo could not be read. Use still PNG, JPEG, or WebP images up to 5 MB and 16 megapixels each." };
  }
  if (!prepared.length) return { error: "Choose at least one replacement photo." };
  if (designSides.some(side => !existing[side] && !prepared.some(photo => photo.side === side))) {
    return { error: "This product needs all four views. Choose a real photo for each missing view before saving." };
  }
  const images = { ...existing };
  try {
    for (const photo of prepared) {
      // Never reuse client filenames or overwrite a photo used by an existing product.
      const path = `products/${id}/${randomUUID()}.webp`;
      const { error } = await supabase.storage.from(bucket).upload(path, photo.body, {
        contentType: "image/webp", upsert: false, cacheControl: "31536000",
      });
      if (error) return { error: "Photos were not saved. Check the image storage setup and your admin access, then try again." };
      images[photo.side] = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    if (new Set(Object.values(images)).size !== 4) return { error: "Each view must have its own product photo." };
    // Compare against the read values so a simultaneous image edit cannot be lost.
    let update = supabase.from("products").update({ image_url: images.front, design_images: images }).eq("id", id);
    update = product.design_images === null ? update.is("design_images", null)
      : update.eq("design_images", JSON.stringify(product.design_images));
    update = product.image_url === null ? update.is("image_url", null) : update.eq("image_url", product.image_url);
    const { data, error } = await update.select("id").maybeSingle();
    if (error) return { error: "Photos were not linked to the product. Check the image database setup and try again." };
    if (!data) return { error: "This product changed or your access was removed. Refresh the page before trying again." };
  } catch {
    // A timeout can occur after a successful write. Preserve uploaded objects so
    // an uncertain commit cannot leave the product referencing deleted photos.
    return { error: "Unable to confirm the save. Refresh the page to check the photos before retrying." };
  }
  revalidatePath("/", "layout");
  return { message: "Product photos saved." };
}
