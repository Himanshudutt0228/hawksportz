"use client";

import { useState } from "react";
import { getPrintArea, designSides, sideLabels, type DesignSide, type SavedDesign } from "@/lib/design";
import { standardPrintInches, measurementScale } from "@/lib/print-measurements";
import DesignApprovalNotice from "./DesignApprovalNotice";
import GarmentPreview from "./GarmentPreview";

export type ProofLine = { name: string; size: string | null; quantity: number };

export default function DesignProof({ design, lines, downloads = false, ownerView = false, approvalEmailsReady = false }: {
  design: SavedDesign; lines: ProofLine[]; downloads?: boolean; ownerView?: boolean; approvalEmailsReady?: boolean;
}) {
  const [activeSide, setActiveSide] = useState<DesignSide>("front");
  const views = ownerView ? designSides : [activeSide];
  return <article className="my-6 min-w-0 break-inside-avoid break-words rounded-xl border border-gray-300 p-4" aria-label={`Design proof ${design.id}`}>
    <h3 className="text-lg font-semibold">{lines[0]?.name ?? "Custom design"}</h3>
    <p className="mt-2 text-sm">Colour: {design.colour}</p>
    <p className="mt-1 break-all text-xs text-gray-500">Design reference: {design.id}</p>
    <ul className="mt-3 text-sm">{lines.map((line, i) => <li key={i}>{line.size ?? "One size"}: {line.quantity}</li>)}</ul>
    <div className="mt-4 rounded bg-gray-50 p-3 text-sm"><strong>Customer comments</strong><p className="mt-1 whitespace-pre-wrap break-words">{design.additionalComments?.trim() || "No additional comments."}</p></div>
    <p className="mt-3 text-xs text-gray-600">Garment previews show your saved design. Measurements are approximate. Final print size and placement may vary depending on the garment’s size and style.</p>
    {!ownerView && <DesignApprovalNotice emailReady={approvalEmailsReady} />}
    {!design.garmentProof && <p className="mt-3 text-sm text-amber-900">This older design has no saved garment photos. Only its artwork layout is available.</p>}
    {downloads && <p className="mt-3 text-sm">Original artwork downloads below preserve the full uploaded resolution. Garment previews are for placement, not printing.</p>}
    {!ownerView && <div role="group" aria-label="Review garment side" className="mt-4 flex flex-wrap gap-2">{designSides.map(side => <button type="button" key={side} aria-pressed={activeSide === side} onClick={() => setActiveSide(side)} className="rounded border px-3 py-2 text-sm aria-pressed:bg-gray-950 aria-pressed:text-white">{sideLabels[side]}</button>)}</div>}
    <div className={ownerView ? "mt-4 grid gap-6 sm:grid-cols-2" : "mx-auto mt-4 max-w-lg"}>
      {views.map(side => {
        const area = getPrintArea(side, design.printAreas?.[side]);
        const inches = standardPrintInches(side, design.printSizes?.[side] ?? "large", design.printTemplate ?? "standard");
        const scale = measurementScale( inches, "in");
        const measure = (w: number, h: number) => inches
          ? `${(w * scale.width).toFixed(2)} x ${(h * scale.height).toFixed(2)} in (${(w * scale.width * 2.54).toFixed(2)} x ${(h * scale.height * 2.54).toFixed(2)} cm)`
          : `${w.toFixed(1)} x ${h.toFixed(1)} preview units`;
        return <section key={side} className="min-w-0 break-inside-avoid">
          <h4 className="font-medium">{sideLabels[side]} - {side === "left" || side === "right" || design.printTemplate === "headwear" ? "Small" : design.printSizes?.[side] === "pocket" ? "Pocket" : "Large"}</h4>
          {!design.layers.some(layer => layer.side === side) && <p className="mt-1 text-sm text-gray-500">No print on this side.</p>}
          <GarmentPreview layers={design.layers} photoUrl={design.garmentProof?.photos[side]} side={side} productName={lines[0]?.name ?? "Custom design"} area={area} />
          <p className="text-xs">Print area: {measure(area.width, area.height)}</p>
          <ul className="mt-3 space-y-3 text-xs">{design.layers.filter(layer => layer.side === side).map((layer, index) => <li key={layer.id} className="break-words">
            <p className="whitespace-pre-wrap font-medium">{index + 1}. {layer.kind === "text" ? layer.text : layer.kind === "art" ? `Graphic: ${layer.artId}` : "Uploaded artwork"}</p>
            <p>Width x height: {measure(layer.width, layer.height)}; rotation: {layer.rotation.toFixed(1)} degrees.</p>
            <p>Opacity: {Math.round((layer.opacity ?? 1) * 100)}%; mirrored horizontally: {layer.flipX ? "yes" : "no"}; mirrored vertically: {layer.flipY ? "yes" : "no"}.</p>
            <p>Centre from print-area top left: {((layer.x - area.x) * scale.width).toFixed(2)}, {((layer.y - area.y) * scale.height).toFixed(2)} {inches ? "in" : "preview units"}.</p>
            {layer.kind === "text" && <p>Font: {layer.font ?? "Arial"}; {layer.bold === false ? "regular" : "bold"}{layer.italic ? "; italic" : ""}; shape: {layer.textShape ?? "straight"}; colour: {layer.color ?? "#111111"}.</p>}
            {downloads && layer.kind === "image" && layer.src && <a className="mt-1 inline-block underline print:hidden" href={layer.src} download={`artwork-${design.id}-${index + 1}.${layer.src.startsWith("data:image/png") ? "png" : "jpg"}`}>Download original artwork {index + 1} (full resolution)</a>}
          </li>)}</ul>
        </section>;
      })}
    </div>
  </article>;
}
