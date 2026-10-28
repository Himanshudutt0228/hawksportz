"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { getPrintArea, sideLabels, resizeLayer, resizeLayerDimension, keepInPrintArea, type DesignLayer, type DesignSide, type PrintArea } from "@/lib/design";
import LayerContent from "@/components/designer/LayerContent";

export default function GarmentPreview({ layers, side, photoUrl, productName, selectedId, selectedIds = [], onSelect, onMove, onResize, onAreaMove, area, guides = true, zoom = 1 }: {
  layers: DesignLayer[]; side: DesignSide; photoUrl?: string; productName: string;
  selectedId?: string | null; onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void; guides?: boolean;
  selectedIds?: string[]; zoom?: number;
  onResize?: (id: string, layer: DesignLayer) => void;
  area?: PrintArea; onAreaMove?: (x: number, y: number) => void;
}) {
  const clipId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const resize = useRef<{ layer: DesignLayer; sx: number; sy: number } | null>(null);
  const areaDrag = useRef<{ dx: number; dy: number } | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = photoUrl && photoUrl !== failedPhoto ? photoUrl : undefined;
  const selected = layers.find((layer) => layer.id === selectedId && layer.side === side);
  const printArea = getPrintArea(side, area);
  const defaultArea = getPrintArea(side);
  const movedArea = printArea.x !== defaultArea.x || printArea.y !== defaultArea.y;
  const focusArea = movedArea || side === "left" || side === "right";
  const zoomX = focusArea ? printArea.x + printArea.width / 2 : 250;
  const zoomY = focusArea ? printArea.y + printArea.height / 2 : 300;
  const point = (event: PointerEvent) => {
    const matrix = svgRef.current!.getScreenCTM();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix!.inverse());
    return { x: point.x, y: point.y };
  };
  function move(event: PointerEvent<SVGSVGElement>) {
    if (areaDrag.current && onAreaMove) {
      const position = point(event);
      onAreaMove(position.x - areaDrag.current.dx, position.y - areaDrag.current.dy);
      return;
    }
    if (resize.current && onResize) {
      const { layer, sx, sy } = resize.current;
      const position = point(event);
      const angle = layer.rotation * Math.PI / 180;
      if (sx === 0 || sy === 0) {
        const axis = sx === 0 ? "height" : "width";
        const ux = axis === "width" ? Math.cos(angle) * sx : -Math.sin(angle) * sy;
        const uy = axis === "width" ? Math.sin(angle) * sx : Math.cos(angle) * sy;
        const ax = layer.x - ux * layer[axis] / 2, ay = layer.y - uy * layer[axis] / 2;
        const size = Math.max(8, (position.x - ax) * ux + (position.y - ay) * uy);
        const next = resizeLayerDimension(layer, axis, size);
        onResize(layer.id, keepInPrintArea({ ...next, x: ax + ux * next[axis] / 2, y: ay + uy * next[axis] / 2 }));
        return;
      }
      const vx = Math.cos(angle) * sx * layer.width - Math.sin(angle) * sy * layer.height;
      const vy = Math.sin(angle) * sx * layer.width + Math.cos(angle) * sy * layer.height;
      const ax = layer.x - vx / 2, ay = layer.y - vy / 2;
      const factor = Math.max(8 / Math.min(layer.width, layer.height), ((position.x - ax) * vx + (position.y - ay) * vy) / (vx * vx + vy * vy));
      if (layer.lockAspectRatio || event.shiftKey) {
        onResize(layer.id, resizeLayer({ ...layer, x: ax + vx * factor / 2, y: ay + vy * factor / 2 }, factor));
      } else {
        const dx = position.x - ax, dy = position.y - ay;
        const next = keepInPrintArea({ ...layer,
          width: Math.max(8, (dx * Math.cos(angle) + dy * Math.sin(angle)) * sx),
          height: Math.max(8, (-dx * Math.sin(angle) + dy * Math.cos(angle)) * sy),
        });
        onResize(layer.id, keepInPrintArea({ ...next,
          x: ax + (Math.cos(angle) * sx * next.width - Math.sin(angle) * sy * next.height) / 2,
          y: ay + (Math.sin(angle) * sx * next.width + Math.cos(angle) * sy * next.height) / 2,
        }));
      }
      return;
    }
    if (!drag.current || !onMove) return;
    const position = point(event);
    onMove(drag.current.id, position.x - drag.current.dx, position.y - drag.current.dy);
  }
  return (
    <svg ref={svgRef} viewBox={`${(zoom === 1 ? 250 : zoomX) - 250 / zoom} ${(zoom === 1 ? 300 : zoomY) - 300 / zoom} ${500 / zoom} ${600 / zoom}`} className="block aspect-[5/6] w-full select-none"
      aria-label={`${sideLabels[side]} garment preview`} role="group"
      onPointerMove={move} onPointerUp={() => { drag.current = null; resize.current = null; areaDrag.current = null; }} onPointerCancel={() => { drag.current = null; resize.current = null; areaDrag.current = null; }}>
      <defs><clipPath id={clipId}><rect {...printArea} /></clipPath></defs>
      <rect width="500" height="600" fill="white" />
      {photo ? <image data-garment-photo="true" href={photo} x="25" y="25" width="450" height="550" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label={`${productName} - ${sideLabels[side]} photo`} onError={() => setFailedPhoto(photo)} />
        : <g fill="#6b7280" textAnchor="middle"><text x="250" y="80" fontSize="14">{sideLabels[side]} product photo not available</text>
          <text x="250" y="105" fontSize="11">Artwork placement view only</text></g>}
      {guides && <rect data-guide="true" data-print-area={side} {...printArea} fill="transparent" stroke="#9ca3af" strokeDasharray="4 5" rx="2" />}
      <g clipPath={`url(#${clipId})`}>
        {layers.filter((layer) => layer.side === side).map((layer) => (
          <g key={layer.id} transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rotation})`}
            role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `Select ${layer.kind === "text" ? layer.text : layer.kind === "art" ? layer.artId : "artwork"}` : undefined}
            className={onSelect ? "cursor-move outline-none" : undefined}
            style={{ touchAction: "none" }}
            onPointerDown={(event) => {
              if (!onSelect) return;
              event.preventDefault(); onSelect(layer.id);
              const position = point(event);
              drag.current = { id: layer.id, dx: position.x - layer.x, dy: position.y - layer.y };
              svgRef.current?.setPointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(layer.id); }
              const directions: Record<string, number[]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
              if (directions[event.key] && onMove) {
                event.preventDefault(); onSelect?.(layer.id);
                onMove(layer.id, layer.x + directions[event.key][0], layer.y + directions[event.key][1]);
              }
            }}>
            <g opacity={layer.opacity ?? 1} transform={`scale(${layer.flipX ? -1 : 1} ${layer.flipY ? -1 : 1})`}><LayerContent layer={layer} /></g>
            <rect x={-layer.width / 2 - 2} y={-layer.height / 2 - 2} width={layer.width + 4} height={layer.height + 4}
              fill="transparent" stroke={onSelect && (selectedId === layer.id || selectedIds.includes(layer.id)) ? "#2563eb" : "transparent"} strokeWidth="1" />
          </g>
        ))}
      </g>
      {selected && onResize && <g data-guide="true" transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation})`}>
        {([{ x: -1, y: -1, label: "top left" }, { x: 1, y: -1, label: "top right" }, { x: -1, y: 1, label: "bottom left" }, { x: 1, y: 1, label: "bottom right" },
          { x: 0, y: -1, label: "top edge" }, { x: 0, y: 1, label: "bottom edge" }, { x: -1, y: 0, label: "left edge" }, { x: 1, y: 0, label: "right edge" }] as const).map((corner) => <g key={corner.label} transform={`translate(${corner.x * selected.width / 2} ${corner.y * selected.height / 2})`}>
          <rect x={-Math.max(8, Math.min(24, selected.width / 3)) / 2} y={-Math.max(8, Math.min(24, selected.height / 3)) / 2}
            width={Math.max(8, Math.min(24, selected.width / 3))} height={Math.max(8, Math.min(24, selected.height / 3))} fill="transparent" role="button" tabIndex={0}
            aria-label={`Resize design ${corner.label}`} style={{ touchAction: "none", cursor: corner.x === 0 ? "ns-resize" : corner.y === 0 ? "ew-resize" : corner.x === corner.y ? "nwse-resize" : "nesw-resize" }}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); resize.current = { layer: { ...selected }, sx: corner.x, sy: corner.y }; svgRef.current?.setPointerCapture(event.pointerId); }}
            onKeyDown={(event) => { if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(event.key)) {
              event.preventDefault();
              const factor = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1.05 : .95;
              onResize(selected.id, corner.x === 0 ? resizeLayerDimension(selected, "height", selected.height * factor)
                : corner.y === 0 ? resizeLayerDimension(selected, "width", selected.width * factor) : resizeLayer(selected, factor));
            } }} />
          <rect x="-6" y="-6" width="12" height="12" rx="2" fill="white" stroke="#2563eb" strokeWidth="2" pointerEvents="none" />
        </g>)}
      </g>}
      {onAreaMove && <g data-guide="true">
        <rect {...printArea} fill="#2563eb" fillOpacity=".08" stroke="#2563eb" strokeWidth="2" strokeDasharray="5 4"
          role="button" tabIndex={0} aria-label={`Move ${sideLabels[side]} print area`}
          style={{ touchAction: "none", cursor: "move" }}
          onPointerDown={(event) => {
            event.preventDefault(); event.stopPropagation();
            const position = point(event); areaDrag.current = { dx: position.x - printArea.x, dy: position.y - printArea.y };
            svgRef.current?.setPointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            const delta: Record<string, number[]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            if (delta[event.key]) {
              event.preventDefault(); const step = event.shiftKey ? 10 : 2;
              onAreaMove(printArea.x + delta[event.key][0] * step, printArea.y + delta[event.key][1] * step);
            }
          }} />
        <rect x={printArea.x} y={Math.max(0, printArea.y - 24)} width={Math.min(printArea.width, 130)} height="22" rx="4" fill="#2563eb" pointerEvents="none" />
        <text x={printArea.x + 6} y={Math.max(0, printArea.y - 24) + 15} fill="white" fontSize="10" pointerEvents="none">Drag print area</text>
      </g>}
      {guides && <text data-guide="true" x="250" y="590" textAnchor="middle" fill="#6b7280" fontSize="10">{sideLabels[side].toUpperCase()} · PRINT AREA SHOWN</text>}
    </svg>
  );
}
