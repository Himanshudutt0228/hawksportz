import {readPrintSizes,printAreaForSize,type PrintSizes,type PrintTemplate} from "./print-pricing.ts";
export const designSides = ["front", "back", "left", "right"] as const;
export type DesignSide = typeof designSides[number];
export const sideLabels: Record<DesignSide, string> = { front: "Front", back: "Back", left: "Left sleeve", right: "Right sleeve" };
export type DesignLayer = {
  id: string;
  kind: "text" | "image" | "art";
  side: DesignSide;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  color?: string;
  font?: string;
  src?: string;
  artId?: string;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number;
  outlineColor?: string;
  outlineWidth?: number;
  textShape?: "straight" | "arch-up" | "arch-down" | "wave" | "circle";
  textAlign?: "left" | "center" | "right";
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  lockAspectRatio?: boolean;
  printArea?: PrintArea;
};

export type DesignProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  garmentStyle?:string|null;
  price: number;
  stock: number;
  sizeStock?: Record<string, number> | null;
  sizes: string[];
  colours: string[];
  imageUrl: string | null;
  viewImages: Partial<Record<DesignSide, string>>;
};

export type SavedDesign = {
  version: 1 | 2 | 3;
  id: string;
  productId: string;
  colour: string;
  additionalComments?: string;
  layers: DesignLayer[];
  quantities: Record<string, number>;
  updatedAt: string;
  printAreas?: Partial<Record<DesignSide, PrintArea>>;
  printSizes?:PrintSizes;
  printTemplate?:PrintTemplate;
};

export const printArea = { x: 155, y: 170, width: 190, height: 250 };
export type PrintArea = typeof printArea;
const sleeveAreas: Record<"left" | "right", PrintArea> = {
  // Garment sides are named from the wearer's perspective in a front-facing photo.
  left: { x: 370, y: 180, width: 65, height: 70 },
  right: { x: 65, y: 180, width: 65, height: 70 },
};

export function getPrintArea(side: DesignSide, override?: PrintArea): PrintArea {
  return override ?? (side === "left" || side === "right" ? sleeveAreas[side] : printArea);
}

export function getLayerPrintArea(layer: DesignLayer): PrintArea {
  return getPrintArea(layer.side, layer.printArea);
}

export function isValidPrintArea(value: unknown): value is PrintArea {
  if (!value || typeof value !== "object") return false;
  const area = value as PrintArea;
  return [area.x, area.y, area.width, area.height].every(Number.isFinite)
    && area.width >= 20 && area.height >= 20 && area.x >= 0 && area.y >= 0
    && area.x + area.width <= 500 && area.y + area.height <= 600;
}

export function relocatePrintArea(layers: DesignLayer[], side: DesignSide, current: PrintArea, x: number, y: number) {
  const area = { ...current, x: Math.max(0, Math.min(500 - current.width, x)), y: Math.max(0, Math.min(600 - current.height, y)) };
  const dx = area.x - current.x, dy = area.y - current.y;
  return { area, layers: layers.map((layer) => layer.side === side
    ? keepInPrintArea({ ...layer, x: layer.x + dx, y: layer.y + dy, printArea: area }) : layer) };
}

export function repositionLayer(layer: DesignLayer, from: PrintArea, to: PrintArea): DesignLayer {
  const scale = Math.min(to.width / from.width, to.height / from.height);
  return keepInPrintArea({ ...layer, printArea: to,
    x: to.x + (layer.x - from.x) / from.width * to.width,
    y: to.y + (layer.y - from.y) / from.height * to.height,
    width: layer.width * scale, height: layer.height * scale,
  });
}

export function moveLayerToSide(layer: DesignLayer, side: DesignSide, target = getPrintArea(side)): DesignLayer {
  return repositionLayer({ ...layer, side }, getLayerPrintArea(layer), target);
}

export function selectionBounds(layers: DesignLayer[]) {
  const boxes = layers.map((layer) => {
    const angle = layer.rotation * Math.PI / 180;
    const halfW = (Math.abs(layer.width * Math.cos(angle)) + Math.abs(layer.height * Math.sin(angle))) / 2;
    const halfH = (Math.abs(layer.width * Math.sin(angle)) + Math.abs(layer.height * Math.cos(angle))) / 2;
    return { left: layer.x - halfW, right: layer.x + halfW, top: layer.y - halfH, bottom: layer.y + halfH };
  });
  return { left: Math.min(...boxes.map((box) => box.left)), right: Math.max(...boxes.map((box) => box.right)),
    top: Math.min(...boxes.map((box) => box.top)), bottom: Math.max(...boxes.map((box) => box.bottom)) };
}

export function moveSelection(layers: DesignLayer[], ids: string[], dx: number, dy: number) {
  const selected = layers.filter((layer) => ids.includes(layer.id));
  if (!selected.length) return layers;
  const printArea = getLayerPrintArea(selected[0]);
  const bounds = selectionBounds(selected);
  const x = Math.max(printArea.x - bounds.left, Math.min(printArea.x + printArea.width - bounds.right, dx));
  const y = Math.max(printArea.y - bounds.top, Math.min(printArea.y + printArea.height - bounds.bottom, dy));
  return layers.map((layer) => ids.includes(layer.id) ? { ...layer, x: layer.x + x, y: layer.y + y } : layer);
}

export function printedSides(layers: DesignLayer[]): DesignSide[] {
  return designSides.filter((side) => layers.some((layer) => layer.side === side));
}

export function productViewImages(product: { image_url?: unknown; design_images?: unknown }): Partial<Record<DesignSide, string>> {
  const images = product.design_images && typeof product.design_images === "object" && !Array.isArray(product.design_images)
    ? product.design_images as Record<string, unknown> : {};
  const result: Partial<Record<DesignSide, string>> = {};
  for (const side of designSides) {
    const url = images[side] ?? (side === "front" ? product.image_url : undefined);
    if (typeof url === "string" && /^(https:\/\/[^/\s]+[^\s]*|\/[^/\s][^\s]*)$/.test(url)) result[side] = url;
  }
  return result;
}

export function missingProductViews(product: { image_url?: unknown; design_images?: unknown }): DesignSide[] {
  const images = productViewImages(product);
  return designSides.filter((side) => !images[side]);
}

export function hasRequiredProductImages(product: { image_url?: unknown; design_images?: unknown }): boolean {
  const images = productViewImages(product);
  return missingProductViews(product).length === 0 && new Set(Object.values(images)).size === 4;
}

export function resizeLayer(layer: DesignLayer, factor: number): DesignLayer {
  if (!Number.isFinite(factor) || factor <= 0) return layer;
  const minimum = 8 / Math.min(layer.width, layer.height);
  return keepInPrintArea({ ...layer, width: layer.width * Math.max(minimum, factor), height: layer.height * Math.max(minimum, factor) });
}

export function resizeLayerDimension(layer: DesignLayer, axis: "width" | "height", value: number): DesignLayer {
  if (!Number.isFinite(value) || value < 8) return layer;
  if (layer.lockAspectRatio) return resizeLayer(layer, value / layer[axis]);
  const printArea = getLayerPrintArea(layer);
  const angle = layer.rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
  const remainingWidth = axis === "width" ? printArea.width - layer.height * sin : printArea.width - layer.width * cos;
  const remainingHeight = axis === "width" ? printArea.height - layer.height * cos : printArea.height - layer.width * sin;
  const widthCoefficient = axis === "width" ? cos : sin;
  const heightCoefficient = axis === "width" ? sin : cos;
  const maximum = Math.min(widthCoefficient > 1e-10 ? remainingWidth / widthCoefficient : Infinity,
    heightCoefficient > 1e-10 ? remainingHeight / heightCoefficient : Infinity);
  return keepInPrintArea({ ...layer, [axis]: Math.max(0.001, Math.min(value, maximum)) });
}

export function resizeSelection(layers: DesignLayer[], ids: string[], factor: number): DesignLayer[] {
  const selected = layers.filter((layer) => ids.includes(layer.id));
  if (!selected.length || !Number.isFinite(factor) || factor <= 0) return layers;
  const printArea = getLayerPrintArea(selected[0]);
  const box = selectionBounds(selected);
  const cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
  const minimum = Math.max(...selected.map((layer) => 8 / Math.min(layer.width, layer.height)));
  const scale = Math.min(printArea.width / (box.right - box.left), printArea.height / (box.bottom - box.top), Math.max(minimum, factor));
  const left = cx + (box.left - cx) * scale, right = cx + (box.right - cx) * scale;
  const top = cy + (box.top - cy) * scale, bottom = cy + (box.bottom - cy) * scale;
  const dx = Math.max(printArea.x - left, Math.min(printArea.x + printArea.width - right, 0));
  const dy = Math.max(printArea.y - top, Math.min(printArea.y + printArea.height - bottom, 0));
  return layers.map((layer) => ids.includes(layer.id) ? { ...layer,
    x: cx + (layer.x - cx) * scale + dx, y: cy + (layer.y - cy) * scale + dy,
    width: layer.width * scale, height: layer.height * scale,
  } : layer);
}

export function keepInPrintArea(layer: DesignLayer): DesignLayer {
  const printArea = getLayerPrintArea(layer);
  const radians = layer.rotation * Math.PI / 180;
  const bounds = (width: number, height: number) => ({
    width: Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians)),
    height: Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians)),
  });
  const box = bounds(layer.width, layer.height);
  const scale = Math.min(1, printArea.width / box.width, printArea.height / box.height);
  const width = layer.width * scale, height = layer.height * scale;
  const fitted = bounds(width, height);
  return { ...layer, width, height,
    x: Math.max(printArea.x + fitted.width / 2, Math.min(printArea.x + printArea.width - fitted.width / 2, layer.x)),
    y: Math.max(printArea.y + fitted.height / 2, Math.min(printArea.y + printArea.height - fitted.height / 2, layer.y)),
  };
}

export function quantityTotal(quantities: Record<string, number>) {
  return Object.values(quantities).reduce((sum, value) => sum + value, 0);
}

export function designPrice(basePrice: number, printPrice: number | null, sides: number, quantity: number) {
  if (printPrice === null || !Number.isFinite(printPrice) || printPrice < 0 || sides < 1 || quantity < 1) return null;
  const unitCents = Math.round(basePrice * 100) + Math.round(printPrice * 100) * sides;
  return { unit: unitCents / 100, total: unitCents * quantity / 100 };
}

export function productColours(product: { colours?: unknown; colors?: unknown; colour?: unknown; color?: unknown }): string[] {
  const values = product.colours ?? product.colors ?? product.colour ?? product.color;
  const list: unknown[] = Array.isArray(values) ? values : [values];
  const colours = [...new Set(list.filter((value): value is string => typeof value === "string")
    .map((value) => value.trim()).filter(Boolean))];
  return colours.length ? colours : ["As pictured"];
}

export function parseDesign(value: unknown): SavedDesign | null {
  if (!value || typeof value !== "object") return null;
  const design = value as Partial<SavedDesign>;
  if ((design.version !== 1 && design.version !== 2 && design.version!==3) || typeof design.id !== "string" || typeof design.productId !== "string"
    || typeof design.colour !== "string" || design.colour.length > 100
    || (design.additionalComments !== undefined && (typeof design.additionalComments !== "string" || design.additionalComments.length > 255))
    || !Array.isArray(design.layers) || design.layers.length > 30
    || !design.quantities || typeof design.quantities !== "object" || Array.isArray(design.quantities)
    || typeof design.updatedAt !== "string") return null;
  const ids = new Set<string>();
  const template=design.printTemplate??"standard";
  if(!["standard","long-sleeve","headwear"].includes(template))return null;
  if(template==="headwear"&&(design.layers.some(layer=>!layer||layer.side!=="front")||design.printSizes?.front!=="pocket"))return null;
  const printAreas: Partial<Record<DesignSide, PrintArea>> = {};
  const printSizes=design.version===3?readPrintSizes(design.printSizes):undefined;
  if(design.version===3&&!printSizes)return null;
  if (design.printAreas !== undefined) {
    if (!design.printAreas || typeof design.printAreas !== "object" || Array.isArray(design.printAreas)) return null;
    for (const [side, area] of Object.entries(design.printAreas)) {
      if (!designSides.includes(side as DesignSide) || !isValidPrintArea(area)) return null;
      printAreas[side as DesignSide] = { x: area.x, y: area.y, width: area.width, height: area.height };
      if(design.version===3){const expected=printAreaForSize(side as DesignSide,printSizes![side as DesignSide]??"large",area,template);
        const oldSmallSleeve=(side==="left"||side==="right")&&area.width<=expected.width&&area.height<=expected.height;
        if(!oldSmallSleeve&&(area.width!==expected.width||area.height!==expected.height))return null;}
    }
  }
  if(design.version===3){for(const view of designSides)printAreas[view]??=printAreaForSize(view,printSizes![view]??"large",undefined,template);}
  for (const layer of design.layers) {
    if (!layer || typeof layer.id !== "string" || ids.has(layer.id)
      || !designSides.includes(layer.side) || !["text", "image", "art"].includes(layer.kind)
      || ![layer.x, layer.y, layer.width, layer.height, layer.rotation].every(Number.isFinite)
      || layer.width <= 0 || layer.width > 100000 || layer.height <= 0 || layer.height > 100000 || Math.abs(layer.rotation) > 180) return null;
    if (layer.kind === "text" && (typeof layer.text !== "string" || layer.text.length > 240
      || !/^#[0-9a-f]{6}$/i.test(layer.color ?? "") || !["Arial", "Arial Black", "Verdana", "Trebuchet MS", "Tahoma", "Georgia", "Times New Roman", "Courier New", "Impact", "Comic Sans MS"].includes(layer.font ?? ""))) return null;
    if (layer.kind === "art" && (!/^(star|heart|lightning|diamond|chevron|shield|trophy|basketball|ball|mountains|pine|sun)$/.test(layer.artId ?? "")
      || !/^#[0-9a-f]{6}$/i.test(layer.color ?? ""))) return null;
    if ((layer.bold !== undefined && typeof layer.bold !== "boolean") || (layer.italic !== undefined && typeof layer.italic !== "boolean")
      || (layer.flipX !== undefined && typeof layer.flipX !== "boolean") || (layer.flipY !== undefined && typeof layer.flipY !== "boolean")
      || (layer.lockAspectRatio !== undefined && typeof layer.lockAspectRatio !== "boolean")
      || (layer.printArea !== undefined && !isValidPrintArea(layer.printArea))
      || (layer.opacity !== undefined && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1))
      || (layer.letterSpacing !== undefined && (!Number.isFinite(layer.letterSpacing) || layer.letterSpacing < -2 || layer.letterSpacing > 12))
      || (layer.outlineWidth !== undefined && (!Number.isFinite(layer.outlineWidth) || layer.outlineWidth < 0 || layer.outlineWidth > 5))
      || (layer.outlineColor !== undefined && !/^#[0-9a-f]{6}$/i.test(layer.outlineColor))
      || (layer.textAlign !== undefined && !["left", "center", "right"].includes(layer.textAlign))
      || (layer.textShape !== undefined && !["straight", "arch-up", "arch-down", "wave", "circle"].includes(layer.textShape))) return null;
    if (layer.kind === "image" && (typeof layer.src !== "string" || layer.src.length > 7 * 1024 * 1024
      || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(layer.src))) return null;
    ids.add(layer.id);
  }
  for (const [size, quantity] of Object.entries(design.quantities)) {
    if (size.length > 100 || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000) return null;
  }
  return { version: design.version===3?3:2, id: design.id, productId: design.productId, colour: design.colour, ...(design.additionalComments ? { additionalComments: design.additionalComments } : {}),
    layers: design.layers.map((layer) => {
      const area = getPrintArea(layer.side, printAreas[layer.side]);
      const placed = { ...layer, printArea: area };
      return design.version === 1 && (layer.side === "left" || layer.side === "right")
        ? repositionLayer(placed, printArea, area) : keepInPrintArea(placed);
    }),
    printAreas,...(printSizes?{printSizes}:{}),...(design.printTemplate?{printTemplate:template}:{}), quantities: { ...design.quantities }, updatedAt: design.updatedAt };
}
