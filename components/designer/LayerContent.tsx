import { useId } from "react";
import { designArt } from "@/lib/design-art";
import type { DesignLayer } from "@/lib/design";

export default function LayerContent({ layer }: { layer: DesignLayer }) {
  const id = `text-path-${useId().replace(/:/g, "")}`;
  if (layer.kind === "image") return <image href={layer.src} x={-layer.width / 2} y={-layer.height / 2} width={layer.width} height={layer.height} preserveAspectRatio="none" />;
  if (layer.kind === "art") {
    const art = designArt.find((entry) => entry.id === layer.artId);
    return <g transform={`translate(${-layer.width / 2} ${-layer.height / 2}) scale(${layer.width / 100} ${layer.height / 100})`}>
      {art?.paths.map((path, index) => <path key={index} d={path} fill={layer.color ?? "#111111"} fillRule="evenodd" />)}
    </g>;
  }
  const shape = layer.textShape ?? "straight";
  const curved = shape !== "straight";
  const lines = (layer.text ?? "").split("\n");
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const fontSize = curved ? layer.height * (shape === "circle" ? .16 : .44) : layer.height / lines.length * .8;
  const half = layer.width / 2;
  const radius = Math.min(layer.width, layer.height) * .38;
  const path = shape === "arch-up" ? `M${-half} ${layer.height * .2} Q0 ${-layer.height * .7} ${half} ${layer.height * .2}`
    : shape === "arch-down" ? `M${-half} ${-layer.height * .2} Q0 ${layer.height * .7} ${half} ${-layer.height * .2}`
    : shape === "wave" ? `M${-half} 0 C${-half * .5} ${-layer.height * .65} ${half * .5} ${layer.height * .65} ${half} 0`
    : `M0 ${-radius} A${radius} ${radius} 0 1 1 -.01 ${-radius}`;
  const textStyle = {
    fontFamily: layer.font ?? "Arial", fontWeight: layer.bold === false ? 400 : 700,
    fontStyle: layer.italic ? "italic" : "normal", fontSize,
    fill: layer.color ?? "#111111", stroke: layer.outlineColor ?? "#ffffff", strokeWidth: layer.outlineWidth ?? 0,
    paintOrder: "stroke fill" as const, strokeLinejoin: "round" as const, letterSpacing: layer.letterSpacing ?? 0,
  };
  if (curved) return <>
    <defs><path id={id} d={path} /></defs>
    <text {...textStyle} textAnchor="middle" dominantBaseline="central">
      <textPath href={`#${id}`} startOffset="50%" textLength={shape === "circle" ? radius * 5.5 : layer.width * .9} lengthAdjust="spacingAndGlyphs">{lines.join(" ")}</textPath>
    </text>
  </>;
  const anchor = layer.textAlign === "left" ? "start" : layer.textAlign === "right" ? "end" : "middle";
  const x = anchor === "start" ? -half : anchor === "end" ? half : 0;
  return <>{lines.map((line, index) => <text key={index} {...textStyle} x={x}
    y={(index - (lines.length - 1) / 2) * layer.height / lines.length}
    textAnchor={anchor} dominantBaseline="central" textLength={Math.max(1, layer.width * line.length / longest)} lengthAdjust="spacingAndGlyphs">{line}</text>)}</>;
}
