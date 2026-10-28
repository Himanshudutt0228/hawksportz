import sharp from "sharp";

export const MAX_PRODUCT_PHOTO_BYTES = 5 * 1024 * 1024;

// Decode and re-encode rather than trusting a filename or browser MIME type.
// Sharp strips metadata by default. Pixel limits bound decoded memory use.
export async function prepareProductPhoto(file: File): Promise<Buffer> {
  if (!file.size || file.size > MAX_PRODUCT_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a PNG, JPEG, or WebP photo up to 5 MB.");
  }
  const source = Buffer.from(await file.arrayBuffer());
  const image = sharp(source, { limitInputPixels: 16000000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) !== 1) throw new Error("Use a still PNG, JPEG, or WebP photo.");
  const result = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 }).toBuffer();
  if (result.length > MAX_PRODUCT_PHOTO_BYTES) throw new Error("Processed photo is too large.");
  return result;
}
