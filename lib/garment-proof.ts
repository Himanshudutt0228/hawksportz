export const garmentViews = ["front", "back", "left", "right"] as const;
export type GarmentProof = { productId: string; photos: Record<typeof garmentViews[number], string>; signature: string };

export function readGarmentProof(value: unknown): GarmentProof | null {
  if (!value || typeof value !== "object") return null;
  const proof = value as Partial<GarmentProof>;
  if (typeof proof.productId !== "string" || !/^[1-9][0-9]{0,18}$/.test(proof.productId) ||
      typeof proof.signature !== "string" || !/^[0-9a-f]{64}$/.test(proof.signature) || !proof.photos || typeof proof.photos !== "object") return null;
  const photos = {} as GarmentProof["photos"];
  for (const side of garmentViews) {
    const photo = proof.photos[side];
    if (typeof photo !== "string" || photo.length > 400000 || !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo)) return null;
    photos[side] = photo;
  }
  return { productId: proof.productId, photos, signature: proof.signature };
}
