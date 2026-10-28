import { remainingStock, type CartItem, type CartProduct } from "./cart.ts";
import {quotePrintAreas,readPrintSizes,type PrintPricing} from "./print-pricing.ts";

export type CurrentProduct = CartProduct & { sizes: string[]; requiresSize: boolean; colours?: string[]; printPricePerSide?: number | null;printPricing?:PrintPricing|null };
export type PendingCheckout = { id: string; lines: { id: string; size: string | null; quantity: number; name?: string; slug?: string; unitCents?: number; customization?: CartProduct["customization"] }[] };

export function restoreReservedItems(items: CartItem[], pending: PendingCheckout[]): CartItem[] {
  const restored = [...items];
  for (const line of pending.flatMap(order => order.lines)) {
    if (restored.some(item => item.id === line.id && item.size === line.size && item.customization?.designId === line.customization?.designId)) continue;
    if (!line.name || !line.slug || !Number.isSafeInteger(line.unitCents) || line.unitCents! < 0 ||
      !Number.isSafeInteger(line.quantity) || line.quantity < 1) continue;
    restored.push({ id: line.id, name: line.name, slug: line.slug, price: line.unitCents! / 100,
      size: line.size, quantity: line.quantity, ...(line.customization ? { customization: line.customization } : {}),
      stock: Math.max(line.quantity + restored.filter(item => item.id === line.id).reduce((sum, item) => sum + item.quantity, 0),
        ...restored.filter(item => item.id === line.id).map(item => item.stock)),
    });
  }
  return restored;
}

export function refreshCart(items: CartItem[], products: CurrentProduct[], checkedIds: string[], pending: PendingCheckout[] = []) {
  const messages: string[] = [];
  const updated: CartItem[] = [];
  for (const item of restoreReservedItems(items, pending)) {
    if (!checkedIds.includes(item.id)) { updated.push(item); continue; }
    let current = products.find((product) => product.id === item.id);
    const reserved = pending.flatMap(order => order.lines)
      .find(line => line.id === item.id && line.size === item.size && line.customization?.designId === item.customization?.designId);
    if (!current && reserved) { updated.push(item); continue; }
    // The public catalog excludes reservations. Only this browser's server-verified
    // pending orders count toward its cart availability; this never changes stock.
    if (current && Number.isSafeInteger(current.stock) && current.stock >= 0) {
      const held = pending.flatMap(order => order.lines).filter(line => line.id === item.id);
      const sizeStock = current.sizeStock == null ? current.sizeStock : { ...current.sizeStock };
      if (sizeStock) {
        for (const line of held) {
          if (line.size !== null && Object.hasOwn(sizeStock, line.size)) sizeStock[line.size] += line.quantity;
        }
      }
      current = { ...current, stock: current.stock + held.reduce((sum, line) => sum + line.quantity, 0), sizeStock };
    }
    const label = `${item.name}${item.size ? ` (${item.size})` : ""}`;
    if (!current || !Number.isSafeInteger(current.stock) || current.stock < 1
      || !Number.isFinite(current.price) || current.price < 0) {
      messages.push(`${label} is no longer available and was removed.`);
      continue;
    }
    if ((current.requiresSize && !item.size)
      || (item.size !== null && !current.sizes.includes(item.size))) {
      messages.push(`${label} is no longer available in that size and was removed.`);
      continue;
    }
    let price = reserved?.unitCents !== undefined ? reserved.unitCents / 100 : current.price;
    let customization = item.customization;
    if (customization && !reserved) {
      if(current.printPricing){
        const sizes=readPrintSizes(customization.printSizes??Object.fromEntries(customization.sides.map(side=>[side,"large" as const])))??{};
        const quote=quotePrintAreas(current.printPricing,customization.sides,sizes,1);
        if(!quote||!current.colours?.includes(customization.colour)){
          messages.push(`${label}: customization is currently unavailable and was removed. Your saved design is still on this device.`);continue;
        }
        price=quote.unit;customization={...customization,printSizes:sizes,printPricePerSide:0};
      } else {
      if(customization.printSizes){messages.push(`${label}: custom pricing is unavailable. Your saved design is still on this device.`);continue;}
      if (current.printPricePerSide == null || !Number.isFinite(current.printPricePerSide) || current.printPricePerSide < 0
        || !current.colours?.includes(customization.colour)) {
        messages.push(`${label}: customization is currently unavailable and was removed. Your saved design is still on this device.`);
        continue;
      }
      price = (Math.round(current.price * 100) + Math.round(current.printPricePerSide * 100) * customization.sides.length) / 100;
      customization = { ...customization, printPricePerSide: current.printPricePerSide };
      }
    }
    const quantity = Math.min(item.quantity, remainingStock(updated, current, item.size));
    if (quantity < item.quantity) messages.push(`${label}: quantity reduced to ${quantity} because stock changed.`);
    if (!quantity) continue;
    if (item.price !== price) messages.push(`${label}: price updated from $${item.price.toFixed(2)} to $${price.toFixed(2)}.`);
    updated.push({ id: current.id, slug: current.slug, name: current.name,
      price, stock: current.stock, size: item.size, quantity,
      ...(current.sizeStock != null ? { sizeStock: current.sizeStock } : {}),
      ...(customization ? { customization } : {}) });
  }
  return { items: updated, messages };
}
