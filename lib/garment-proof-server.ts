import "server-only";
import sharp from "sharp";
import { garmentViews, type GarmentProof } from "./garment-proof";
import { signGarmentPhotos } from "./garment-proof-signature";

// Product photo URLs must stay on our public Supabase image buckets, including redirects.
export function trustedGarmentPhoto(value: string, supabaseUrl: string): URL {
  const url = new URL(value);
  const base = new URL(supabaseUrl);
  if (url.origin !== base.origin || url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !/^\/storage\/v1\/object\/public\/(product-images|admin-product-images)\/.+/.test(url.pathname)) throw new Error("Unsupported garment photo");
  return url;
}

async function freezePhoto(source: string, supabaseUrl: string): Promise<string> {
  const url = trustedGarmentPhoto(source, supabaseUrl);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error("Garment photo unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 5 * 1024 * 1024) { await reader.cancel(); throw new Error("Garment photo too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const image = sharp(Buffer.concat(chunks), { limitInputPixels: 16000000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.format || !["png", "jpeg", "webp"].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error("Unsupported garment photo");
  // Only garment backgrounds are normalized; customer artwork stays at original resolution.
  const photo = await image.rotate().resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  if (photo.length > 290000) throw new Error("Garment preview too large");
  return `data:image/webp;base64,${photo.toString("base64")}`;
}

export async function freezeGarmentPhotos(productId: string, urls: Partial<Record<typeof garmentViews[number], string>>, supabaseUrl: string, secret: string): Promise<GarmentProof> {
  const photos = {} as GarmentProof["photos"];
  // Sequential downloads bound memory per request.
  for (const side of garmentViews) {
    if (!urls[side]) throw new Error("Four garment photos required");
    photos[side] = await freezePhoto(urls[side], supabaseUrl);
  }
  return signGarmentPhotos(productId, photos, secret);
}
