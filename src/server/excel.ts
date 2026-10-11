import ExcelJS from "exceljs";
import { isNoGrade, normalizeNumberText, NO_GRADE, parseNumber, Student, Subject } from "../shared/model";

export type ParseErrorCode = "empty" | "no_subjects" | "no_students" | "duplicate_subject" | "parse_failed";

export class ExcelParseError extends Error {
  constructor(public code: ParseErrorCode, public detail?: string) {
    super(code);
  }
}

function cellText(ws: ExcelJS.Worksheet, r: number, c: number): string {
  try {
    return (ws.getCell(r, c).text ?? "").toString().trim();
  } catch {
    return "";
  }
}

/**
 * Expected layout: A1 empty; B1.. = subject names; A2.. = student names;
 * remaining cells = grades. A column holding only numbers is numeric, otherwise categorical.
 */
export async function parseExcel(buffer: Buffer): Promise<{ subjects: Subject[]; students: Student[] }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as any);
  } catch {
    throw new ExcelParseError("parse_failed");
  }

  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount === 0) throw new ExcelParseError("empty");

  const cols: { col: number; name: string }[] = [];
  const names = new Set<string>();
  for (let c = 2; c <= ws.columnCount; c++) {
    const name = cellText(ws, 1, c);
    if (!name) continue;
    const key = name.toLowerCase();
    if (names.has(key)) throw new ExcelParseError("duplicate_subject", name);
    names.add(key);
    cols.push({ col: c, name });
  }
  if (cols.length === 0) throw new ExcelParseError("no_subjects");

  const rows: { name: string; raw: string[] }[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const name = cellText(ws, r, 1);
    if (!name) continue;
    rows.push({ name, raw: cols.map((c) => cellText(ws, r, c.col)) });
  }
  if (rows.length === 0) throw new ExcelParseError("no_students");

  const subjects: Subject[] = cols.map((c, i) => {
    const present = rows.map((row) => row.raw[i]).filter((v) => !isNoGrade(v));
    const numeric = present.every((v) => parseNumber(v) !== null);
    if (numeric) return { id: `s${i + 1}`, name: c.name, kind: "numeric" as const };
    return { id: `s${i + 1}`, name: c.name, kind: "categorical" as const, options: [...new Set(present)] };
  });

  const students: Student[] = rows.map((row) => {
    const grades: Record<string, string> = {};
    subjects.forEach((s, i) => {
      const v = row.raw[i];
      if (isNoGrade(v)) return;
      grades[s.id] = s.kind === "numeric" ? normalizeNumberText(v) : v;
    });
    return { name: row.name, grades };
  });

  return { subjects, students };
}

export async function createSampleExcel(lang: "en" | "fa"): Promise<Buffer> {
  const fa = lang === "fa";
  const subjects = fa
    ? ["ریاضی", "علوم", "ادبیات", "زبان انگلیسی", "انضباط"]
    : ["Mathematics", "Science", "Literature", "English", "Behavior"];
  const levels = fa ? ["عالی", "خوب", "قابل قبول"] : ["Excellent", "Good", "Acceptable"];
  const students: (string | number)[][] = fa
    ? [
        ["علی رضایی", 18, 17.5, 16, 19, levels[0]],
        ["سارا احمدی", 19, NO_GRADE, 17.5, 18.5, levels[1]],
        ["محمد کریمی", 17, 16.5, 18, 17.5, levels[2]],
        ["زهرا صادقی", 19.5, 19, 18.5, NO_GRADE, levels[0]],
      ]
    : [
        ["Alice Johnson", 18, 17.5, 16, 19, levels[0]],
        ["Brian Smith", 19, NO_GRADE, 17.5, 18.5, levels[1]],
        ["Carla Gomez", 17, 16.5, 18, 17.5, levels[2]],
        ["Daniel Lee", 19.5, 19, 18.5, NO_GRADE, levels[0]],
      ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(fa ? "نمونه" : "Sample", { views: [{ rightToLeft: fa }] });
  ws.addRow(["", ...subjects]); // A1 is intentionally empty
  students.forEach((s) => ws.addRow(s));

  ws.getColumn(1).width = 24;
  for (let c = 2; c <= subjects.length + 1; c++) ws.getColumn(c).width = 16;

  const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFB8C2D1" } };
  const center: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };
  for (let r = 1; r <= students.length + 1; r++) {
    for (let c = 1; c <= subjects.length + 1; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = c === 1 && r > 1 ? { vertical: "middle" } : center;
      if (r === 1 && c > 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4FBF" } };
      }
      if (c === 1 && r > 1) cell.font = { bold: true };
      if (r > 1 || c > 1) cell.border = { left: thin, top: thin, bottom: thin, right: thin };
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
