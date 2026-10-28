"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import GarmentPreview from "@/components/designer/GarmentPreview";
import LayerEditor from "@/components/designer/LayerEditor";
import { useCart } from "@/components/CartProvider";
import { saveDesign, loadDesign } from "@/lib/design-storage";
import type { CurrentProduct } from "@/lib/cart-refresh";
import { remainingStock } from "@/lib/cart";
import DismissibleNotice from "@/components/DismissibleNotice";
import { keepInPrintArea, printedSides, quantityTotal, parseDesign, moveSelection, selectionBounds, designSides, sideLabels, resizeSelection, getPrintArea, moveLayerToSide, relocatePrintArea,repositionLayer,
  type DesignLayer, type DesignProduct, type DesignSide, type SavedDesign, type PrintArea } from "@/lib/design";

const control = "mt-1.5 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-gray-900";
const button = "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";
const primary = "rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40";
import {customPricingForCategory,printAreaForSize,printTemplateForProduct,quotePrintAreas,readPrintSizes,type PrintSize,type PrintSizes} from "@/lib/print-pricing";
type StudioSnapshot = { layers: DesignLayer[]; printAreas: Partial<Record<DesignSide, PrintArea>>;printSizes?:PrintSizes };

export default function DesignStudio({ products,initialProductId,catalogHref="/custom-apparel" }: { products: DesignProduct[];initialProductId?:string;catalogHref?:string }) {
  const { items, ready, dispatch } = useCart();
  const initialProduct=products.find(product=>product.id===initialProductId)??products[0];
  const [productId, setProductId] = useState(initialProduct?.id ?? "");
  const product = products.find((entry) => entry.id === productId);
  const template=printTemplateForProduct(product);
  const headwear=template==="headwear";
  const availableSides:readonly DesignSide[]=headwear?["front"]:designSides;
  const [colour, setColour] = useState(initialProduct?.colours[0] ?? "As pictured");
  const [history, setHistory] = useState<StudioSnapshot[]>([{ layers: [], printAreas: {} }]);
  const [cursor, setCursor] = useState(0);
  const { layers, printAreas } = history[cursor];
  const printSizes:PrintSizes={left:"pocket",right:"pocket",...readPrintSizes(history[cursor].printSizes??{}),...(headwear?{front:"pocket" as const}:{})};
  const [side, setSide] = useState<DesignSide>("front");
  const sleeve=side==="left"||side==="right";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(true);
  const [adjustingArea, setAdjustingArea] = useState(false);
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [text, setText] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const designInput = useRef<HTMLInputElement>(null);
  const dragStart = useRef<StudioSnapshot | null>(null);
  const uploadVersion = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const cartItemsRef = useRef(items);
  useEffect(() => { cartItemsRef.current = items; }, [items]);
  useEffect(() => {
    if (message || error) statusRef.current?.focus();
  }, [message, error]);
  const selected = layers.find((layer) => layer.id === selectedId);
  const area = printAreaForSize(side,printSizes[side]??"large",printAreas[side],template);
  const hasDraft = layers.length > 0 || Object.keys(printAreas).length > 0;
  const selectedIds = groupIds.length ? groupIds : selected ? [selected.id] : [];
  const visibleSelection = layers.filter((layer) => selectedIds.includes(layer.id) && layer.side === side);
  const selectionBox = visibleSelection.length ? selectionBounds(visibleSelection) : null;
  const totalQuantity = quantityTotal(quantities);
  const sides = printedSides(layers);
  const validDesign = layers.length > 0 && !layers.some((layer) => layer.kind === "text" && !layer.text?.trim());
  const used = product ? items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0) : 0;
  const available = product ? Math.max(0, product.stock - used) : 0;
  const pricing=product?customPricingForCategory(product.category,product.price):null;
  const price=quotePrintAreas(pricing,sides,printSizes,totalQuantity);
  const canOrder = !!product && ready && !!price && validDesign && totalQuantity > 0 && totalQuantity <= available
    && Object.entries(quantities).every(([size, quantity]) => quantity === 0 ||
      (product.sizes.includes(size) && quantity <= remainingStock(items, product, size)));

  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    const requestedId = new URLSearchParams(window.location.search).get("design");
    // Audience browsing must not restore an unrelated garment or clear its saved pointer.
    try { id = requestedId ?? (initialProductId||new URLSearchParams(window.location.search).has("audience") ? null : localStorage.getItem("hawk-sportz-last-design")); } catch { /* Continue without a stored draft. */ }
    const forgetUnavailableDraft = () => {
      try {
        if (localStorage.getItem("hawk-sportz-last-design") === id) localStorage.removeItem("hawk-sportz-last-design");
      } catch { /* The saved artwork remains in IndexedDB. */ }
    };
    const restore = async () => {
      try {
        // A fresh restoration must not retain a warning from a previous draft
        // or from development hot refresh preserving this component's state.
        setError("");
        setMessage("");
        if (id) {
          const design = await loadDesign(id);
          if (cancelled) return;
          const savedProduct = products.find((entry) => entry.id === design?.productId);
          if (design && savedProduct) {
            if(printTemplateForProduct(savedProduct)==="headwear"&&design.layers.some(layer=>layer.side!=="front"))throw new Error("This product supports front artwork only. Your saved copy is unchanged.");
            setProductId(savedProduct.id);
            setSide("front");
            setColour(savedProduct.colours.includes(design.colour) ? design.colour : savedProduct.colours[0]);
            const areas=Object.fromEntries(designSides.map(view=>[view,printAreaForSize(view,design.printSizes?.[view]??"large",design.printAreas?.[view],printTemplateForProduct(savedProduct))])) as Partial<Record<DesignSide,PrintArea>>;
            setHistory([{layers:design.layers.map(layer=>repositionLayer(layer,getPrintArea(layer.side,layer.printArea),areas[layer.side]!)),printAreas:areas,printSizes:design.printSizes??{}}]);setCursor(0);setAdditionalComments(design.additionalComments??"");
            setQuantities(Object.fromEntries(Object.entries(design.quantities).filter(([size]) => savedProduct.sizes.includes(size))));
            setMessage("Saved design opened. Your original saved copy is unchanged.");
          } else {
            // Forget only the automatic reopen pointer, never saved artwork.
            forgetUnavailableDraft();
            if (design && requestedId !== null) {
              setError("The garment used in your previous design is no longer available. Choose a garment to start a new design. Your saved artwork has not been deleted.");
            } else if (requestedId !== null) {
              setError("This saved design is not available in this browser. Open it on the device where you saved it, or import your downloaded design file.");
            }
          }
        }
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not restore the design."); }
      finally { if (!cancelled) setRestoring(false); }
    };
    void restore();
    return () => { cancelled = true; };
  }, [products,initialProductId]);

  function commit(next: DesignLayer[], areas = printAreas,sizes=printSizes) {
    setHistory((previous) => [...previous.slice(0, cursor + 1), { layers: next, printAreas: areas,printSizes:sizes }].slice(-50));
    setCursor(Math.min(cursor + 1, 49));
    setApproved(false); setMessage(""); setError("");
  }
  function navigateStep(index: number) {
    setStep(index); setSelectedId(null); setGroupIds([]); setAdjustingArea(false); setError("");
    studioRef.current?.scrollIntoView({ block: "start" });
  }
  function updateLayer(id: string, patch: Partial<DesignLayer>) {
    if(patch.side&&!availableSides.includes(patch.side))return;
    commit(layers.map((layer) => layer.id === id ? patch.side && patch.side !== layer.side
      ? moveLayerToSide({ ...layer, ...patch, side: layer.side }, patch.side, printAreaForSize(patch.side,printSizes[patch.side]??"large",printAreas[patch.side],template))
      : keepInPrintArea({ ...layer, ...patch }) : layer));
    if (patch.side) { setSide(patch.side); setGroupIds([]); }
  }
  function resizeDesign(id: string, next: DesignLayer) {
    const resized = layers.map((layer) => layer.id === id ? next : layer);
    if (dragStart.current) {
      setHistory((previous) => previous.map((snapshot, index) => index === cursor ? { ...snapshot, layers: resized } : snapshot));
      setApproved(false); setMessage("");
    } else commit(resized);
  }
  function selectLayer(id: string) { setGroupIds([]); setSelectedId(id); }
  function duplicateSelection() {
    const originals = layers.filter((layer) => selectedIds.includes(layer.id));
    if (layers.length + originals.length > 30) { setError("You can add up to 30 elements per design."); return; }
    const copies = originals.map((layer) => keepInPrintArea({ ...layer, id: crypto.randomUUID(), x: layer.x + 8, y: layer.y + 8 }));
    commit([...layers, ...copies]);
    if (copies.length === 1) selectLayer(copies[0].id);
    else { setSelectedId(null); setGroupIds(copies.map((layer) => layer.id)); }
  }
  function removeSelection() {
    commit(layers.filter((layer) => !selectedIds.includes(layer.id)));
    setSelectedId(null); setGroupIds([]);
  }
  function orderSelection(direction: "front" | "back") {
    const chosen = layers.filter((layer) => selectedIds.includes(layer.id));
    const remaining = layers.filter((layer) => !selectedIds.includes(layer.id));
    commit(direction === "front" ? [...remaining, ...chosen] : [...chosen, ...remaining]);
  }
  function centerSelection(axis: "x" | "y") {
    const bounds = selectionBounds(layers.filter((layer) => selectedIds.includes(layer.id)));
    commit(moveSelection(layers, selectedIds, axis === "x" ? area.x + area.width / 2 - (bounds.left + bounds.right) / 2 : 0,
      axis === "y" ? area.y + area.height / 2 - (bounds.top + bounds.bottom) / 2 : 0));
  }
  function moveLayer(id: string, x: number, y: number) {
    const original = layers.find((layer) => layer.id === id);
    const moved = original && groupIds.includes(id) ? moveSelection(layers, groupIds, x - original.x, y - original.y)
      : layers.map((layer) => layer.id === id ? keepInPrintArea({ ...layer, x, y }) : layer);
    if (dragStart.current) {
      setHistory((previous) => previous.map((snapshot, index) => index === cursor ? { ...snapshot, layers: moved } : snapshot));
      setApproved(false); setMessage("");
    } else commit(moved);
  }
  function finishDrag() {
    if (!dragStart.current) return;
    const original = dragStart.current;
    dragStart.current = null;
    if (JSON.stringify(original) === JSON.stringify(history[cursor])) return;
    setHistory((previous) => [...previous.slice(0, cursor), original, history[cursor]].slice(-50));
    setCursor(Math.min(cursor + 1, 49));
  }
  function moveArea(x: number, y: number) {
    const moved = relocatePrintArea(layers, side, area, x, y);
    const next = { layers: moved.layers, printAreas: { ...printAreas, [side]: moved.area },printSizes };
    if (dragStart.current) {
      setHistory((previous) => previous.map((snapshot, index) => index === cursor ? next : snapshot));
      setApproved(false); setMessage("");
    } else commit(next.layers, next.printAreas);
  }
  function addText() {
    if (!text.trim() || layers.length >= 30) return;
    const layer: DesignLayer = keepInPrintArea({ id: crypto.randomUUID(), kind: "text", side,
      x: area.x + area.width / 2, y: area.y + area.height * .36,
      width: Math.min(area.width * .85, Math.max(30, text.trim().length * 12)), height: 28,
      rotation: 0, text: text.trim(), color: "#111111", font: "Arial", printArea: area });
    commit([...layers, layer]); selectLayer(layer.id); setText("");
  }
  function choosePrintSize(size:PrintSize){
    const nextArea=printAreaForSize(side,size,area,template);
    commit(layers.map(layer=>layer.side===side?repositionLayer(layer,area,nextArea):layer),{...printAreas,[side]:nextArea},{...printSizes,[side]:size});
    setSelectedId(null);setGroupIds([]);setAdjustingArea(true);setShowGuides(true);setZoom(1);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a PNG or JPEG image up to 5 MB."); return;
    }
    if (layers.length >= 30) { setError("You can add up to 30 elements per design."); return; }
    if (layers.reduce((sum, layer) => sum + (layer.src?.length ?? 0), 0) + file.size * 1.4 > 20 * 1024 * 1024) {
      setError("This design has too much image data. Remove an image or upload a smaller file."); return;
    }
    const version = uploadVersion.current;
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width, height = bitmap.height;
      bitmap.close();
      if (!width || !height || width * height > 40000000) throw new Error("Choose an image smaller than 40 megapixels.");
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not open that image.")); reader.readAsDataURL(file);
      });
      if (version !== uploadVersion.current) return;
      const scale = Math.min(Math.min(150, area.width * .8) / width, Math.min(180, area.height * .8) / height);
      const layer: DesignLayer = { id: crypto.randomUUID(), kind: "image", side,
        x: area.x + area.width / 2, y: area.y + area.height / 2, width: width * scale, height: height * scale, rotation: 0, src, printArea: area };
      commit([...layers, layer]); selectLayer(layer.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "That file could not be opened. Try a PNG or JPEG image."); }
  }
  function snapshot(id: string): SavedDesign {
    return { version: 3, id, productId, colour, layers, additionalComments, printTemplate:template,
      printAreas:Object.fromEntries(availableSides.map(view=>[view,printAreaForSize(view,printSizes[view]??"large",printAreas[view],template)])),
      printSizes:{...printSizes},quantities, updatedAt: new Date().toISOString() };
  }
  async function save() {
    if (!hasDraft) { setError("Add artwork or text, or adjust the print area before saving."); return; }
    setSaving(true); setError("");
    try {
      const id = draftId ?? crypto.randomUUID();
      await saveDesign(snapshot(id)); setDraftId(id);
      try { localStorage.setItem("hawk-sportz-last-design", id); } catch { /* IndexedDB still contains the saved draft. */ }
      const savedUrl=new URL(window.location.href);
      savedUrl.searchParams.set("design",id);
      savedUrl.searchParams.set("product",productId);
      window.history.replaceState(null,"",savedUrl);
      setMessage("Design saved on this device. You can return here to continue editing.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save your design."); }
    finally { setSaving(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify(snapshot(draftId ?? crypto.randomUUID()), null, 2)], { type: "application/json" });
    downloadBlob(blob, "hawk-sportz-design.json");
  }
  async function openDesign(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a design file smaller than 25 MB.");
      const design = parseDesign(JSON.parse(await file.text()));
      if (!design) throw new Error("This is not a supported Hawk Sportz design file.");
      const savedProduct = products.find((entry) => entry.id === design.productId);
      if (!savedProduct) throw new Error("The garment in this design is no longer available.");
      if(printTemplateForProduct(savedProduct)==="headwear"&&design.layers.some(layer=>layer.side!=="front"))throw new Error("This product supports front artwork only. Your original file is unchanged.");
      uploadVersion.current++;
      setProductId(savedProduct.id); setColour(savedProduct.colours.includes(design.colour) ? design.colour : savedProduct.colours[0]);
      setSide("front");
      const areas=Object.fromEntries(designSides.map(view=>[view,printAreaForSize(view,design.printSizes?.[view]??"large",design.printAreas?.[view],printTemplateForProduct(savedProduct))])) as Partial<Record<DesignSide,PrintArea>>;
      setHistory([{layers:design.layers.map(layer=>repositionLayer(layer,getPrintArea(layer.side,layer.printArea),areas[layer.side]!)),printAreas:areas,printSizes:design.printSizes??{}}]); setCursor(0); setStep(0); setSelectedId(null); setGroupIds([]); setDraftId(null); setAdjustingArea(false);
      setQuantities(Object.fromEntries(Object.entries(design.quantities).filter(([size]) => savedProduct.sizes.includes(size))));
      setApproved(false); setError(""); setMessage("Design file opened. You can continue editing.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not open this design file."); }
  }
  async function downloadPreview() {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1000"); clone.setAttribute("height", "1200");
    clone.setAttribute("viewBox", "0 0 500 600");
    clone.querySelectorAll("[data-guide]").forEach((element) => element.remove());
    clone.querySelectorAll("g[role=button] > rect").forEach((element) => element.remove());
    try {
      const photo = clone.querySelector("image[data-garment-photo]");
      const url = photo?.getAttribute("href");
      if (photo && url) {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Could not download the garment photo. Please try again.");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/") || blob.size > 15 * 1024 * 1024) throw new Error("This garment photo cannot be included in the download.");
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not export this preview.")); reader.readAsDataURL(blob);
        });
        photo.setAttribute("href", data);
      }
      downloadBlob(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }), `hawk-sportz-${side}-preview.svg`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not export this preview."); }
  }
  async function addToCart() {
    if (!product || !canOrder || !price || !approved || !pricing) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/cart/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [product.id] }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Could not check current prices and availability. Your cart has not changed. Please try again.");
      const data: { products: CurrentProduct[] } = await response.json();
      const current = data.products.find((entry) => entry.id === product.id);
      if (!current || JSON.stringify(current.printPricing)!==JSON.stringify(pricing)
        || !current.colours?.includes(colour) || Object.entries(quantities).some(([size, count]) => count > 0 && !current.sizes.includes(size))) {
        throw new Error("This garment's options or pricing have changed. Save your design, then refresh this page before adding it to the cart.");
      }
      // Keep the cart's design immutable even if the customer keeps editing their draft.
      const id = crypto.randomUUID();
      await saveDesign(snapshot(id));
      const currentUsed = cartItemsRef.current.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (currentUsed + totalQuantity > current.stock) throw new Error("There is not enough stock for this quantity. Your design is saved, but your cart has not changed.");
      if (Object.entries(quantities).some(([size, count]) => count > remainingStock(cartItemsRef.current, current, size))) {
        throw new Error("There is not enough stock in one of your selected sizes. Your design is saved; refresh the page and adjust the quantities.");
      }
      dispatch({ type: "add-design", product: { id: product.id, slug: product.slug,
        name: current.name, price: price.unit, stock: current.stock, sizeStock: current.sizeStock,
        customization: { designId: id, colour, sides, printPricePerSide:0, additionalComments: additionalComments.trim(),
          printSizes:Object.fromEntries(sides.map(view=>[view,printSizes[view]??"large"])) } }, quantities });
      setMessage("Your custom apparel has been added to the cart. Your design is saved on this device.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save your design. Your cart has not changed."); }
    finally { setSaving(false); }
  }
  if (!product) return <p className="mt-8 rounded-xl bg-gray-50 p-6">No customizable apparel is available yet. <Link href="/product" className="underline">Shop ready-made products</Link></p>;

  return (
    <div ref={studioRef} className="mt-7 min-w-0 scroll-mt-4">
      <ol aria-label="Design steps" className="mb-6 grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
        {["Design", "Sizes & quantities", "Review"].map((label, index) => <li key={label}>
          <button type="button" disabled={restoring || (index > 0 && !validDesign) || (index > 1 && (!totalQuantity || totalQuantity > available))}
            onClick={() => navigateStep(index)} aria-current={step === index ? "step" : undefined}
            className={`h-full w-full px-2 py-4 text-left disabled:opacity-40 sm:px-5 ${step === index ? "bg-gray-950 font-medium text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            <span className="mr-2 opacity-60">0{index + 1}</span>{label}
          </button>
        </li>)}
      </ol>
      {restoring && <p role="status" className="mb-4 text-sm">Opening the design studio...</p>}
      <div ref={statusRef} tabIndex={-1} className="outline-none">
        {error && <DismissibleNotice tone="error" className="mb-4" onDismiss={() => setError("")}>{error}</DismissibleNotice>}
        {message && <DismissibleNotice tone="success" className="mb-4" onDismiss={() => setMessage("")}>{message}{message.includes("added to the cart") && <Link href="/cart" className="ml-2 font-medium underline">View cart</Link>}</DismissibleNotice>}
      </div>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <section aria-label="Design tools" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Selected product</span>
            <Link href={catalogHref} className="text-sm underline" onClick={event=>{
              if(hasDraft&&!window.confirm("Save or export your design before changing products. Leave this design?"))event.preventDefault();
            }}>Change product</Link></div>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            {product.imageUrl && <Image src={product.imageUrl} alt={product.name} width={56} height={56} className="h-14 w-14 rounded bg-white object-contain" />}
            <div className="min-w-0 text-sm"><p className="font-medium">{product.name}</p><p className="mt-1 text-gray-500">{pricing?`Base CA$${(pricing.baseCents/100).toFixed(2)}`:"Base price awaiting confirmation"}</p></div>
          </div>
          <label className="mt-4 block text-sm font-medium">Garment colour<select value={colour} disabled={saving} className={control}
            onChange={(event) => { setColour(event.target.value); setApproved(false); }}>
            {product.colours.map((value) => <option key={value}>{value}</option>)}
          </select></label>
          {step===0&&<fieldset className="mt-5" disabled={restoring||saving}>
            <legend className="text-sm font-medium">Print size for {sideLabels[side].toLowerCase()}</legend>
            <div className={`mt-3 grid gap-2 ${(sleeve||headwear)?"grid-cols-1":"grid-cols-2"}`}>{((sleeve||headwear)?["pocket"] as const:["pocket","large"] as const).map(size=><button key={size} type="button" aria-pressed={(printSizes[side]??"large")===size}
              onClick={()=>choosePrintSize(size)} className={`rounded-lg border px-3 py-3 text-sm ${(printSizes[side]??"large")===size?"border-brand-link bg-brand/10":"border-gray-300"}`}>
              {(sleeve||headwear)?"Small · CA$2.50":size==="pocket"?"Pocket · CA$2.50":"Large · CA$5.00"}</button>)}</div>
            <p className="mt-3 text-xs leading-5 text-gray-500">Choose a size, move its box on this view, then add your artwork. One print area per view. Only views with artwork are charged.</p>
          </fieldset>}
          {step === 0 && <fieldset disabled={restoring || saving} className="mt-6 border-t border-gray-100 pt-5">
            <legend className="sr-only">Artwork and text</legend>
            <button type="button" onClick={() => fileInput.current?.click()} className={`${button} w-full`} disabled={layers.length >= 30}>Upload artwork</button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg" aria-label="Upload artwork file" onChange={upload} className="sr-only" tabIndex={-1} />
            <p className="mt-2 text-xs leading-5 text-gray-500">PNG or JPEG · up to 5 MB. Transparent PNG works best.</p>
            <label className="mt-5 block text-sm font-medium">Add your text<input value={text} maxLength={240} className={control} placeholder="Your team. Your name."
              onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addText(); } }} /></label>
            <button type="button" onClick={addText} disabled={!text.trim() || layers.length >= 30} className={`${button} mt-3 w-full`}>Add text</button>
          </fieldset>}
          {step === 0 && <div className="mt-6 border-t border-gray-100 pt-5">
            <h2 className="text-sm font-medium">Layers · {side}</h2>
            <p className="mt-2 text-xs text-gray-500">Drag an element in the preview, or use arrow keys to position it.</p>
            <ul className="mt-3 space-y-2">{layers.filter((layer) => layer.side === side).map((layer, index) => <li key={layer.id}>
              <button type="button" onClick={() => selectLayer(layer.id)} className={`w-full truncate rounded-lg border px-3 py-2 text-left text-sm ${selectedIds.includes(layer.id) ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                {layer.kind === "text" ? layer.text : layer.kind === "art" ? layer.artId : `Artwork ${index + 1}`}
              </button></li>)}</ul>
            {!layers.some((layer) => layer.side === side) && <p className="mt-3 text-sm text-gray-400">No elements on this side yet.</p>}
          </div>}
          {step === 1 && <div className="mt-6 border-t border-gray-100 pt-5">
            <h2 className="font-medium">Size quantities</h2><p className="mt-2 text-sm text-gray-500">{available} garments available across all sizes.</p>
            {product.sizes.length ? <div className="mt-4 space-y-3">{product.sizes.map((size) => <label key={size} className="flex items-center justify-between gap-3 text-sm font-medium">{size}
              <input aria-label={`Quantity for size ${size}`} type="number" min={0} max={remainingStock(items, product, size)} step={1} value={quantities[size] ?? 0}
                onChange={(event) => { const value = Number(event.target.value); if (Number.isSafeInteger(value) && value >= 0) { setQuantities((previous) => ({ ...previous, [size]: value })); setApproved(false); } }}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2" /></label>)}</div>
              : <p className="mt-4 text-sm text-amber-800">Sizes have not been listed for this garment yet. You can save your design and return later.</p>}
            {totalQuantity > available && <p role="alert" className="mt-4 text-sm text-red-700">Reduce your quantity to {available} or fewer.</p>}
            {Object.entries(quantities).some(([size, count]) => count > remainingStock(items, product, size)) &&
              <p role="alert" className="mt-4 text-sm text-red-700">Reduce quantities to the available stock for each size.</p>}
          </div>}
          {step === 2 && <div className="mt-6 border-t border-gray-100 pt-5 text-sm">
            <h2 className="font-medium">Your selection</h2><p className="mt-3">{colour}</p>
            <label htmlFor="design-comments" className="mt-5 block font-medium">Additional comments (optional)</label>
            <textarea id="design-comments" maxLength={255} rows={3} value={additionalComments} onChange={event => setAdditionalComments(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal" />
            <p className="mt-1 text-xs text-gray-500">Up to 255 characters. Included with this design in your order.</p>
            {Object.entries(quantities).filter(([, value]) => value > 0).map(([size, value]) => <p key={size} className="mt-2">{size} × {value}</p>)}
            {sides.map(view=><p key={view} className="mt-3">{sideLabels[view]}: {headwear||view==="left"||view==="right"?"Small":(printSizes[view]??"large")==="pocket"?"Pocket":"Large"} print</p>)}
          </div>}
        </section>

        <section aria-label="Design preview" className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-[#f4f4f2] lg:sticky lg:top-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
            <div className="grid w-full grid-cols-4 gap-2" role="group" aria-label="Garment side">
              {availableSides.map((value) => <button key={value} type="button" aria-label={sideLabels[value]} aria-pressed={side === value}
                onClick={() => { setSide(value); setSelectedId(null); setGroupIds([]); setAdjustingArea(false); }} className={`flex min-w-0 flex-col items-center rounded-lg border px-1 py-2 text-xs ${side === value ? "border-gray-950 bg-gray-50 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {product.viewImages[value] ? <svg viewBox="0 0 60 60" className="mb-1 h-12 w-12" aria-hidden="true"><image href={product.viewImages[value]} width="60" height="60" preserveAspectRatio="xMidYMid meet" /></svg>
                  : <span className="mb-1 flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-center text-[9px] leading-3 text-gray-500">Photo<br />needed</span>}
                {sideLabels[value]}
              </button>)}
            </div>
            {step === 0 && <div className="flex gap-2"><button type="button" className="text-xs underline disabled:opacity-30" disabled={cursor === 0} onClick={() => { setCursor(cursor - 1); setApproved(false); setGroupIds([]); setSelectedId(null); }}>Undo</button>
              <button type="button" className="text-xs underline disabled:opacity-30" disabled={cursor >= history.length - 1} onClick={() => { setCursor(cursor + 1); setApproved(false); setGroupIds([]); setSelectedId(null); }}>Redo</button></div>}
          </div>
          {step === 0 && <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 text-xs">
            <button type="button" aria-pressed={adjustingArea} onClick={() => { setAdjustingArea(!adjustingArea); if (!adjustingArea) setZoom(1); setShowGuides(true); setSelectedId(null); setGroupIds([]); }}
              className={`rounded-lg border px-3 py-2 font-medium ${adjustingArea ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-300"}`}>
              {adjustingArea ? "Done positioning" : "Move print area"}
            </button>
            <button type="button" className="underline" onClick={() => { const defaults = printAreaForSize(side,printSizes[side]??"large",undefined,template); moveArea(defaults.x, defaults.y); }}>Reset print area</button>
            <span className="text-gray-500">{adjustingArea ? "Drag the blue box to the correct place on the garment." : "Adjust where artwork can be placed on this view."}</span>
          </div>}
          {step === 0 && selectionBox && <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-200 bg-blue-50 px-4 py-3 text-xs" role="group" aria-label="Quick design size">
            <span className="font-medium">Design size</span>
            <button type="button" className="rounded border border-blue-200 bg-white px-3 py-2 font-medium" onClick={() => commit(resizeSelection(layers, selectedIds, .85))}>− Smaller</button>
            <span className="tabular-nums">{Math.round(selectionBox.right - selectionBox.left)} × {Math.round(selectionBox.bottom - selectionBox.top)}</span>
            <button type="button" className="rounded border border-blue-200 bg-white px-3 py-2 font-medium" onClick={() => commit(resizeSelection(layers, selectedIds, 1.15))}>+ Larger</button>
            {selected && <span className="text-blue-800">Or drag a blue corner</span>}
            <button type="button" onClick={removeSelection} className="rounded border border-red-200 bg-white px-3 py-2 font-medium text-red-700 hover:bg-red-50">Delete selected</button>
          </div>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-gray-200 bg-white px-4 py-3 text-xs">
            {step === 0 && <>
              <button type="button" disabled={!layers.some((layer) => layer.side === side)} onClick={() => { setSelectedId(null); setGroupIds(layers.filter((layer) => layer.side === side).map((layer) => layer.id)); }} className="underline disabled:opacity-30">Select all</button>
              <button type="button" disabled={!selectedIds.length} onClick={() => { setGroupIds([]); setSelectedId(null); }} className="underline disabled:opacity-30">Deselect</button>
              <button type="button" disabled={!layers.some((layer) => layer.side === side)} onClick={() => { commit(layers.filter((layer) => layer.side !== side)); setGroupIds([]); setSelectedId(null); }} className="underline disabled:opacity-30">Clear side</button>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} className="accent-black" />Guides</label>
            </>}
            <label className="ml-auto flex items-center gap-2">Zoom<select aria-label="Preview zoom" value={zoom} disabled={adjustingArea} onChange={(event) => setZoom(Number(event.target.value))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">
              <option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option>
            </select></label>
          </div>
          <div ref={previewRef} className="mx-auto max-w-[500px] px-3"
            onPointerDownCapture={() => { if (step === 0) dragStart.current = history[cursor]; }}
            onPointerUp={finishDrag} onPointerCancel={finishDrag}>
            <GarmentPreview layers={layers} side={side} photoUrl={product.viewImages[side]} productName={product.name}
              area={area} selectedId={selectedId} selectedIds={groupIds} zoom={zoom} guides={step === 0 && showGuides}
              onAreaMove={step === 0 && adjustingArea ? moveArea : undefined}
              onSelect={step === 0 && !adjustingArea ? (id) => { if (!groupIds.includes(id)) selectLayer(id); } : undefined} onMove={step === 0 && !adjustingArea ? moveLayer : undefined} onResize={step === 0 && !adjustingArea ? resizeDesign : undefined} />
          </div>
          <p className="px-5 pb-5 text-center text-xs leading-5 text-gray-500">{product.viewImages[side]
            ? "Selected garment photo. Print placement is approximate; final print dimensions need confirmation."
            : `${sideLabels[side]} photo has not been added for this garment. This view shows your artwork placement only.`}</p>
        </section>

        <aside aria-label="Design details" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
          {step===0&&<div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm" aria-label="Current custom price">
            <p className="font-semibold">{price?`CA$${price.unit.toFixed(2)} per item`:pricing?`Base CA$${(pricing.baseCents/100).toFixed(2)} + printing`:"Base price awaiting confirmation"}</p>
            <p className="mt-2 text-xs leading-5 text-gray-600">Pocket/small CA$2.50 each · Large CA$5.00 each. Sleeves: small only. Shipping and taxes are additional.</p>
          </div>}
          {step === 0 && selected ? <LayerEditor key={selected.id} layer={selected} availableSides={availableSides} onChange={(patch) => updateLayer(selected.id, patch)} onRemove={removeSelection} onDuplicate={duplicateSelection} onOrder={orderSelection} />
            : step === 0 && groupIds.length ? <div className="space-y-3">
              <h2 className="font-medium">{groupIds.filter((id) => layers.some((layer) => layer.id === id)).length} elements selected</h2>
              <p className="text-xs leading-5 text-gray-500">Drag the selection together, or use these actions.</p>
              <button type="button" className={`${button} w-full`} onClick={duplicateSelection}>Duplicate selection</button>
              <button type="button" className={`${button} w-full`} onClick={() => centerSelection("x")}>Center selection</button>
              <button type="button" className={`${button} w-full`} onClick={() => centerSelection("y")}>Center selection vertically</button>
              <button type="button" className={`${button} w-full`} onClick={() => orderSelection("front")}>Bring selection to front</button>
              <button type="button" className={`${button} w-full`} onClick={removeSelection}>Remove selection</button>
            </div> : step === 0 ? <div><h2 className="font-medium">Your design starts here</h2><p className="mt-3 text-sm leading-6 text-gray-500">Upload your artwork or add text. Select an element to edit its appearance and position.</p></div> : <div>
            <h2 className="font-medium">Price summary</h2>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>Base / item</dt><dd>{pricing?`CA$${(pricing.baseCents/100).toFixed(2)}`:"Not set"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Pocket/small prints / item</dt><dd>{price?.pockets??0} × CA$2.50</dd></div>
              <div className="flex justify-between gap-3"><dt>Large prints / item</dt><dd>{price?.large??0} × CA$5.00</dd></div>
              <div className="flex justify-between gap-3"><dt>Quantity</dt><dd>{totalQuantity}</dd></div>
              {price && <><div className="flex justify-between gap-3"><dt>Custom item</dt><dd>${price.unit.toFixed(2)}</dd></div><div className="flex justify-between gap-3 border-t pt-3 font-semibold"><dt>Subtotal</dt><dd>${price.total.toFixed(2)}</dd></div></>}
            </dl>
            {!pricing && <DismissibleNotice className="mt-4 leading-6">The base price for this garment is awaiting confirmation. You can save or download your design.</DismissibleNotice>}
            <p className="mt-4 text-xs leading-5 text-gray-500">Shipping and taxes are not included.</p>
          </div>}
          <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
            {step === 0 && <button type="button" className={`${primary} w-full`} disabled={!layers.length || restoring || saving || layers.some((layer) => layer.kind === "text" && !layer.text?.trim())}
              onClick={() => navigateStep(1)}>Continue to sizes</button>}
            {step === 1 && <button type="button" className={`${primary} w-full`} disabled={!totalQuantity || totalQuantity > available || saving}
              onClick={() => navigateStep(2)}>Review design</button>}
            {step === 2 && <>
              <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="mt-1.5 accent-black" />I have reviewed the spelling, artwork, and placement, and have permission to use this design.</label>
              <button type="button" className={`${primary} w-full`} disabled={!canOrder || !approved || saving} onClick={addToCart}>{saving ? "Saving..." : "Add custom apparel to cart"}</button>
            </>}
            <button type="button" className={`${button} w-full`} onClick={save} disabled={!hasDraft || saving || restoring}>{saving ? "Saving..." : "Save design"}</button>
            <button type="button" className="w-full py-1 text-xs underline disabled:opacity-40" onClick={download} disabled={!hasDraft}>Download editable design</button>
            <button type="button" className="w-full py-1 text-xs underline disabled:opacity-40" onClick={downloadPreview} disabled={!layers.length}>Download {side} preview</button>
            <button type="button" className="w-full py-1 text-xs underline" onClick={() => designInput.current?.click()} disabled={restoring || saving}>Open a design file</button>
            <input ref={designInput} type="file" accept="application/json,.json" aria-label="Open saved design file" onChange={openDesign} className="sr-only" tabIndex={-1} />
            <p className="text-xs leading-5 text-gray-500">Saved designs stay in this browser on this device. Download a copy to keep it elsewhere.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
