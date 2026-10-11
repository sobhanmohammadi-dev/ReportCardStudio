/** Shared (server + client) data model and grading rules. Must not use DOM or Node APIs. */

/** The always-present "no grade" option / marker. Never counted toward totals or averages. */
export const NO_GRADE = "-";

export type SubjectKind = "numeric" | "categorical";

export interface Subject {
  id: string;
  name: string;
  kind: SubjectKind;
  /** numeric only (undefined = unconstrained, e.g. imported from Excel) */
  min?: number;
  max?: number;
  step?: number;
  /** categorical only; excludes NO_GRADE, which is implicit */
  options?: string[];
}

export interface Student {
  name: string;
  /** subject id -> raw grade text ("" or "-" = no grade) */
  grades: Record<string, string>;
}

export interface ClassInfo {
  school: string;
  grade: string;
  className: string;
}

export interface Dataset extends ClassInfo {
  subjects: Subject[];
  students: Student[];
}

/** Maps Persian (U+06F0-06F9) and Arabic-Indic (U+0660-0669) digits to ASCII digits. */
export function normalizeDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x6f0 && c <= 0x6f9) out += String(c - 0x6f0);
    else if (c >= 0x660 && c <= 0x669) out += String(c - 0x660);
    else out += ch;
  }
  return out;
}

/** Normalizes digits and the decimal separator (".", "," and "٫" are all accepted). */
export function normalizeNumberText(s: string): string {
  return normalizeDigits(s).trim().replace(/[٫,]/g, ".");
}

/** Strict number parsing (the whole text must be a number). */
export function parseNumber(s: string): number | null {
  const t = normalizeNumberText(s);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function isNoGrade(v: string | undefined): boolean {
  const t = (v ?? "").trim();
  return t === "" || t === NO_GRADE;
}

export type GradeError = "notNumber" | "outOfRange" | "badStep" | "notInOptions";

/** Returns null when the grade is valid (or empty). */
export function validateGrade(subject: Subject, raw: string): GradeError | null {
  if (isNoGrade(raw)) return null;
  if (subject.kind === "categorical") {
    return (subject.options ?? []).includes(raw.trim()) ? null : "notInOptions";
  }
  const n = parseNumber(raw);
  if (n === null) return "notNumber";
  const eps = 1e-9;
  if (subject.min !== undefined && n < subject.min - eps) return "outOfRange";
  if (subject.max !== undefined && n > subject.max + eps) return "outOfRange";
  if (subject.step !== undefined && subject.step > 0) {
    const base = subject.min ?? 0;
    const k = (n - base) / subject.step;
    if (Math.abs(k - Math.round(k)) > 1e-6) return "badStep";
  }
  return null;
}

export interface SubjectErrors {
  name?: "required" | "duplicate";
  min?: "invalid";
  max?: "invalid" | "minMax";
  step?: "invalid" | "tooLarge";
  options?: "required";
}

/** Validates subject definitions. Returns only subjects that have errors, keyed by id. */
export function validateSubjects(subjects: Subject[]): Record<string, SubjectErrors> {
  const result: Record<string, SubjectErrors> = {};
  const seen = new Map<string, number>();
  for (const s of subjects) {
    const key = s.name.trim().toLowerCase();
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const s of subjects) {
    const e: SubjectErrors = {};
    const name = s.name.trim();
    if (!name) e.name = "required";
    else if ((seen.get(name.toLowerCase()) ?? 0) > 1) e.name = "duplicate";

    if (s.kind === "numeric") {
      const okMin = s.min !== undefined && Number.isFinite(s.min);
      const okMax = s.max !== undefined && Number.isFinite(s.max);
      if (!okMin) e.min = "invalid";
      if (!okMax) e.max = "invalid";
      else if (okMin && s.max! <= s.min!) e.max = "minMax";
      if (s.step === undefined || !Number.isFinite(s.step) || s.step <= 0) e.step = "invalid";
      else if (okMin && okMax && s.max! > s.min! && s.step > s.max! - s.min!) e.step = "tooLarge";
    } else if (!s.options || s.options.length === 0) {
      e.options = "required";
    }
    if (Object.keys(e).length) result[s.id] = e;
  }
  return result;
}

export interface Summary {
  total: number;
  count: number;
  average: number;
}

/** Only numeric subjects with an actual grade contribute. */
export function summarize(student: Student, subjects: Subject[]): Summary {
  let total = 0;
  let count = 0;
  for (const s of subjects) {
    if (s.kind !== "numeric") continue;
    const v = student.grades[s.id];
    if (isNoGrade(v)) continue;
    const n = parseNumber(v);
    if (n !== null) {
      total += n;
      count++;
    }
  }
  return { total, count, average: count ? total / count : 0 };
}

export function displayGrade(v: string | undefined): string {
  return isNoGrade(v) ? NO_GRADE : v!.trim();
}
