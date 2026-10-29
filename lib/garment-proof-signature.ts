import { createHmac, timingSafeEqual } from "node:crypto";
import { garmentViews, readGarmentProof, type GarmentProof } from "./garment-proof.ts";

export function signGarmentPhotos(productId: string, photos: GarmentProof["photos"], secret: string): GarmentProof {
  if (secret.length < 32) throw new Error("Proof signing unavailable");
  const body = JSON.stringify(["hawk-garment-proof-v1", productId, ...garmentViews.map(side => photos[side])]);
  return { productId, photos, signature: createHmac("sha256", secret).update(body).digest("hex") };
}

export function verifyGarmentProof(value: unknown, productId: string, secret: string): boolean {
  const proof = readGarmentProof(value);
  if (!proof || proof.productId !== productId || secret.length < 32) return false;
  const expected = signGarmentPhotos(productId, proof.photos, secret).signature;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(proof.signature, "hex"));
}
