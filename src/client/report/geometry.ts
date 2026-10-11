/**
 * Pure layout maths for the printable report cards (no DOM access, unit-tested).
 *
 * Everything is expressed in millimetres on a portrait A4 sheet. For a given template, number
 * of subjects and cards-per-sheet, `fitRow` returns the row height (`r`) that makes the card
 * fill its grid cell exactly. The CSS in `static/css/report.css` derives every font size and
 * block height from `--r`, so the card can never overflow its cell by construction.
 */

export type TemplateId = "minimal" | "professional" | "playful";
export type SummaryMode = "none" | "average" | "both";

export const SHEET = { w: 210, h: 297 } as const;

/** Safety margin (mm) subtracted from every cell to absorb browser sub-pixel rounding. */
const SAFETY = 0.4;

export interface TemplateSpec {
  id: TemplateId;
  /** Allowed cards-per-sheet values, ascending. */
  options: number[];
  /** cards-per-sheet -> [columns, rows] */
  grids: Record<number, [number, number]>;
  /** Sheet margin and gap between cards (mm). */
  margin: number;
  gap: number;
  defaultSummary: SummaryMode;
  /** Smallest row height (mm) still offered in the UI, and the smallest `auto` will pick. */
  rMin: number;
  rAuto: number;
  rMax(perSheet: number): number;
  /** Height (mm) of everything in the card that does not scale with the row height. */
  fixed(summary: SummaryMode, perSheet: number): number;
  /** Height of the scalable part, in multiples of the row height. */
  units(subjects: number, summary: SummaryMode): number;
}

export const summaryRows = (m: SummaryMode): number => (m === "both" ? 2 : m === "average" ? 1 : 0);

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  minimal: {
    id: "minimal",
    options: [2, 3, 4, 6, 8, 9, 10, 12, 15, 18, 21],
    grids: { 2: [1, 2], 3: [1, 3], 4: [2, 2], 6: [2, 3], 8: [2, 4], 9: [3, 3], 10: [2, 5], 12: [3, 4], 15: [3, 5], 18: [3, 6], 21: [3, 7] },
    margin: 7,
    gap: 0,
    defaultSummary: "none",
    rMin: 3.9,
    rAuto: 4.6,
    rMax: (p) => (p <= 4 ? 8 : 6.2),
    // 2 x 2.5 mm padding
    fixed: () => 5,
    // name 1.45 + class 1.05 + gap 0.35 (+ gap 0.25 before the summary rows)
    units: (n, s) => 2.85 + n + (summaryRows(s) ? summaryRows(s) + 0.25 : 0),
  },
  professional: {
    id: "professional",
    options: [1, 2],
    grids: { 1: [1, 1], 2: [1, 2] },
    margin: 10,
    gap: 6,
    defaultSummary: "both",
    rMin: 4.0,
    rAuto: 4.6,
    rMax: (p) => (p === 1 ? 9 : 6.5),
    // border 0.8 + padding 10 + header 16 + 3 + info 9 + 3 + 3 + footer 20
    fixed: () => 64.8,
    units: (n, s) => 1.2 + n + summaryRows(s),
  },
  playful: {
    id: "playful",
    options: [1, 2],
    grids: { 1: [1, 1], 2: [1, 2] },
    margin: 10,
    gap: 6,
    defaultSummary: "both",
    rMin: 4.2,
    rAuto: 5.0,
    rMax: (p) => (p === 1 ? 10.5 : 6.8),
    // border 2 + padding 8 + head 18 + 3 + name 14 + 2 + chips 6 + 3 + (3 + 9 signatures) [+ 3 + 14 summary]
    fixed: (s) => (s === "none" ? 68 : 85),
    units: (n) => 1.15 * n - 0.15,
  },
};

export interface SheetGeometry {
  perSheet: number;
  cols: number;
  rows: number;
  margin: number;
  gap: number;
  cellW: number;
  cellH: number;
}

export function sheetGeometry(spec: TemplateSpec, perSheet: number): SheetGeometry {
  const [cols, rows] = spec.grids[perSheet];
  const cellW = (SHEET.w - 2 * spec.margin - (cols - 1) * spec.gap) / cols;
  const cellH = (SHEET.h - 2 * spec.margin - (rows - 1) * spec.gap) / rows;
  return { perSheet, cols, rows, margin: spec.margin, gap: spec.gap, cellW, cellH };
}

export interface Fit {
  /** Row height (mm) to render with. */
  r: number;
  /** Unclamped row height that would exactly fill the cell. */
  rFit: number;
  /** Whether the text stays at or above the template's minimum size. */
  fits: boolean;
  /** Resulting card height (mm). */
  height: number;
}

export function fitRow(spec: TemplateSpec, perSheet: number, subjects: number, summary: SummaryMode): Fit {
  const g = sheetGeometry(spec, perSheet);
  const fixed = spec.fixed(summary, perSheet);
  const units = spec.units(subjects, summary);
  const rFit = (g.cellH - fixed - SAFETY) / units;
  const r = Math.max(Math.min(rFit, spec.rMax(perSheet)), 1);
  return { r, rFit, fits: rFit >= spec.rMin, height: fixed + units * r };
}

/** The densest layout whose text is still comfortably readable; falls back to the sparsest. */
export function autoPerSheet(spec: TemplateSpec, subjects: number, summary: SummaryMode): number {
  for (let i = spec.options.length - 1; i >= 0; i--) {
    if (fitRow(spec, spec.options[i], subjects, summary).rFit >= spec.rAuto) return spec.options[i];
  }
  return spec.options[0];
}

export function resolvePerSheet(spec: TemplateSpec, requested: number | "auto", subjects: number, summary: SummaryMode): number {
  if (requested !== "auto" && spec.options.includes(requested)) return requested;
  return autoPerSheet(spec, subjects, summary);
}
