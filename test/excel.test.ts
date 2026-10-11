import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { test } from "node:test";
import { createSampleExcel, ExcelParseError, parseExcel } from "../src/server/excel.ts";

async function workbook(rows: (string | number | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const code = async (buf: Buffer): Promise<string | undefined> => parseExcel(buf).then(() => undefined, (e: ExcelParseError) => e.code);

for (const lang of ["en", "fa"] as const) {
  test(`the ${lang} sample file parses into the documented layout`, async () => {
    const { subjects, students } = await parseExcel(await createSampleExcel(lang));
    assert.equal(subjects.length, 5);
    assert.equal(students.length, 4);
    assert.deepEqual(subjects.map((s) => s.kind), ["numeric", "numeric", "numeric", "numeric", "categorical"]);
    assert.equal(students[0].grades[subjects[0].id], "18");
    assert.equal(students[1].grades[subjects[1].id], undefined, '"-" is stored as no grade');
    assert.deepEqual(subjects[4].options, lang === "en" ? ["Excellent", "Good", "Acceptable"] : ["عالی", "خوب", "قابل قبول"]);
  });
}

test("column type is inferred; Persian digits are normalised; blank rows are skipped", async () => {
  const buf = await workbook([
    [null, "Math", "Beh", "Art"],
    ["Ann", "۱۷٫۵", "Good", null],
    ["Bob", "-", "Bad", null],
    ["Cy", 20, "Good", "-"],
    [null, 5, 5, 5],
  ]);
  const { subjects, students } = await parseExcel(buf);
  assert.deepEqual(subjects.map((s) => [s.name, s.kind]), [["Math", "numeric"], ["Beh", "categorical"], ["Art", "numeric"]]);
  assert.deepEqual(subjects[1].options, ["Good", "Bad"]);
  assert.equal(students.length, 3);
  assert.equal(students[0].grades[subjects[0].id], "17.5");
  assert.deepEqual(students[1].grades, { [subjects[1].id]: "Bad" });
});

test("a column mixing numbers and words becomes categorical", async () => {
  const { subjects } = await parseExcel(await workbook([[null, "X"], ["A", 10], ["B", "absent"]]));
  assert.equal(subjects[0].kind, "categorical");
  assert.deepEqual(subjects[0].options, ["10", "absent"]);
});

test("malformed files report a specific error code", async () => {
  assert.equal(await code(await workbook([[null], ["Ann"]])), "no_subjects");
  assert.equal(await code(await workbook([[null, "Math"]])), "no_students");
  assert.equal(await code(await workbook([[null, "Math", "math"], ["Ann", 1, 2]])), "duplicate_subject");
  assert.equal(await code(Buffer.from("not an xlsx file")), "parse_failed");
});
