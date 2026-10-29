import type { DesignSide } from "./design";
import { printAreaForSize, type PrintSize, type PrintTemplate } from "./print-pricing.ts";

export type MeasurementUnit = "in" | "cm";
// One shared scale for every apparel view and print size. Large's 190-unit
// width is estimated at 11 inches; all other dimensions follow that reference.
// Garment photos are not calibrated production templates.
const inchesPerPreviewUnit = 11 / printAreaForSize("front", "large").width;

export function standardPrintInches(side: DesignSide, size: PrintSize, template: PrintTemplate) {
  if (template === "headwear") return null;
  const area = printAreaForSize(side, size, undefined, template);
  return { width: area.width * inchesPerPreviewUnit, height: area.height * inchesPerPreviewUnit };
}

export function measurementScale(inches: { width: number; height: number } | null, unit: MeasurementUnit) {
  const factor = unit === "cm" ? 2.54 : 1;
  const scale = inches ? inchesPerPreviewUnit * factor : 1;
  return { width: scale, height: scale };
}
