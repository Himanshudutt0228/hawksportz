"use client";

import { useState } from "react";
import { designFonts } from "@/lib/design-art";
import { designSides, sideLabels, resizeLayer, resizeLayerDimension, getLayerPrintArea, type DesignLayer, type DesignSide } from "@/lib/design";

const control = "mt-1.5 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50";

export default function LayerEditor({ layer, onChange, onRemove, onDuplicate, onOrder, availableSides=designSides }: {
  availableSides?:readonly DesignSide[];
  layer: DesignLayer; onChange: (patch: Partial<DesignLayer>) => void;
  onRemove: () => void; onDuplicate: () => void; onOrder: (direction: "front" | "back") => void;
}) {
  const area = getLayerPrintArea(layer);
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-medium">Edit {layer.kind === "text" ? "text" : layer.kind === "art" ? "graphic" : "artwork"}</h2>
      <button type="button" className={`${button} text-red-700`} onClick={onRemove}>Remove</button>
    </div>
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-sm font-medium">Design size</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" aria-label="Make design smaller" className={button} onClick={() => onChange(resizeLayer(layer, .85))}>− Smaller</button>
        <button type="button" aria-label="Make design larger" className={button} onClick={() => onChange(resizeLayer(layer, 1.15))}>+ Larger</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DimensionField label="Width" maximum={area.width} value={layer.width} onChange={(width) => onChange(resizeLayerDimension(layer, "width", width))} />
        <DimensionField label="Height" maximum={area.height} value={layer.height} onChange={(height) => onChange(resizeLayerDimension(layer, "height", height))} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!layer.lockAspectRatio} onChange={(event) => onChange({ lockAspectRatio: event.target.checked })} className="accent-black" />Lock proportions</label>
      <p className="mt-2 text-xs leading-5 text-gray-500">Width and height change independently when unlocked. Drag a top or bottom handle to change height.</p>
    </div>
    {layer.kind === "text" && <>
      <label className="block text-sm">Text<textarea rows={3} className={control} value={layer.text ?? ""} maxLength={240} onChange={(event) => onChange({ text: event.target.value })} /></label>
      <label className="block text-sm">Font<select value={layer.font ?? "Arial"} className={control} onChange={(event) => onChange({ font: event.target.value })}>
        {designFonts.map((font) => <option key={font} value={font}>{font}</option>)}
      </select></label>
      <div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} font-bold`} aria-pressed={layer.bold !== false} onClick={() => onChange({ bold: layer.bold === false })}>Bold</button>
        <button type="button" className={`${button} italic`} aria-pressed={!!layer.italic} onClick={() => onChange({ italic: !layer.italic })}>Italic</button></div>
      <label className="block text-sm">Text alignment<select className={control} value={layer.textAlign ?? "center"} onChange={(event) => onChange({ textAlign: event.target.value as DesignLayer["textAlign"] })}>
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select></label>
      <label className="block text-sm">Letter spacing: {layer.letterSpacing ?? 0}<input type="range" aria-label="Letter spacing" min={-2} max={12} step={.5} value={layer.letterSpacing ?? 0} className="mt-2 w-full accent-gray-950" onChange={(event) => onChange({ letterSpacing: Number(event.target.value) })} /></label>
      <label className="block text-sm">Text shape<select value={layer.textShape ?? "straight"} className={control} onChange={(event) => {
        const shape = event.target.value as DesignLayer["textShape"];
        onChange({ textShape: shape, height: shape === "straight" ? Math.min(layer.height, 45) : shape === "circle" ? layer.width : Math.max(layer.height, layer.width * .55) });
      }}><option value="straight">Straight</option><option value="arch-up">Arch up</option><option value="arch-down">Arch down</option><option value="wave">Wave</option><option value="circle">Circle</option></select></label>
      <label className="block text-sm">Outline thickness<input type="range" min={0} max={5} step={.25} value={layer.outlineWidth ?? 0} className="mt-2 w-full accent-gray-950" onChange={(event) => onChange({ outlineWidth: Number(event.target.value) })} /></label>
      <label className="flex items-center justify-between gap-3 text-sm">Outline colour<input type="color" aria-label="Outline colour" value={layer.outlineColor ?? "#ffffff"} onChange={(event) => onChange({ outlineColor: event.target.value })} className="h-9 w-14 rounded border border-gray-200" /></label>
    </>}
    {layer.kind !== "image" && <label className="flex items-center justify-between gap-3 text-sm">{layer.kind === "text" ? "Text colour" : "Graphic colour"}<input type="color" aria-label={layer.kind === "text" ? "Text colour" : "Graphic colour"} value={layer.color ?? "#111111"} onChange={(event) => onChange({ color: event.target.value })} className="h-9 w-14 rounded border border-gray-200" /></label>}
    <label className="block text-sm">Element width<input type="range" min={8} max={area.width} step={1} value={Math.round(layer.width)} className="mt-3 w-full accent-gray-950"
      onChange={(event) => onChange(resizeLayerDimension(layer, "width", Number(event.target.value)))} /></label>
    <label className="block text-sm">Element height<input type="range" min={8} max={area.height} step={1} value={Math.round(layer.height)} className="mt-3 w-full accent-gray-950"
      onChange={(event) => onChange(resizeLayerDimension(layer, "height", Number(event.target.value)))} /></label>
    <label className="block text-sm">Rotation: {Math.round(layer.rotation)}°<input type="range" aria-label="Element rotation" min={-180} max={180} value={layer.rotation} className="mt-3 w-full accent-gray-950" onChange={(event) => onChange({ rotation: Number(event.target.value) })} /></label>
    <label className="block text-sm">Opacity: {Math.round((layer.opacity ?? 1) * 100)}%<input type="range" aria-label="Element opacity" min={.1} max={1} step={.05} value={layer.opacity ?? 1} className="mt-2 w-full accent-gray-950" onChange={(event) => onChange({ opacity: Number(event.target.value) })} /></label>
    <div className="grid grid-cols-2 gap-2"><button type="button" className={button} aria-pressed={!!layer.flipX} onClick={() => onChange({ flipX: !layer.flipX })}>Flip horizontal</button><button type="button" className={button} aria-pressed={!!layer.flipY} onClick={() => onChange({ flipY: !layer.flipY })}>Flip vertical</button></div>
    <label className="block text-sm">Horizontal position<input type="range" min={area.x} max={area.x + area.width} value={Math.round(layer.x)} className="mt-2 w-full accent-gray-950" onChange={(event) => onChange({ x: Number(event.target.value) })} /></label>
    <label className="block text-sm">Vertical position<input type="range" min={area.y} max={area.y + area.height} value={Math.round(layer.y)} className="mt-2 w-full accent-gray-950" onChange={(event) => onChange({ y: Number(event.target.value) })} /></label>
    <div className="grid grid-cols-2 gap-2"><button type="button" className={button} onClick={() => onChange({ x: area.x + area.width / 2 })}>Center</button><button type="button" className={button} onClick={() => onChange({ y: area.y + area.height / 2 })}>Center vertically</button></div>
    <div className="grid grid-cols-2 gap-2"><button type="button" className={button} onClick={() => onOrder("front")}>Bring to front</button><button type="button" className={button} onClick={() => onOrder("back")}>Send to back</button></div>
    <button type="button" className={`${button} w-full`} onClick={onDuplicate}>Duplicate</button>
    <label className="block text-sm">Print side<select value={layer.side} className={control} onChange={(event) => onChange({ side: event.target.value as DesignSide })}>
      {availableSides.map((side) => <option key={side} value={side}>{sideLabels[side]}</option>)}
    </select></label>
  </div>;
}

function DimensionField({ label, value, maximum, onChange }: {
  label: string; value: number; maximum: number; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<{ source: number; text: string | null }>({ source: value, text: null });
  if (draft.source !== value) setDraft({ source: value, text: null });
  return <label className="text-xs">{label}<input type="number" aria-label={`Design ${label.toLowerCase()}`} min={8} max={maximum} step={1}
    value={draft.text ?? Math.round(value)} className={control}
    onChange={(event) => {
      setDraft({ source: value, text: event.target.value });
      const number = Number(event.target.value);
      if (Number.isFinite(number) && number >= 8 && number <= maximum) onChange(number);
    }}
    onBlur={() => setDraft({ source: value, text: null })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
  </label>;
}
