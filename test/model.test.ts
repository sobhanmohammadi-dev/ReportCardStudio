import assert from "node:assert/strict";
import { test } from "node:test";
import { isNoGrade, normalizeNumberText, parseNumber, Student, Subject, summarize, validateGrade, validateSubjects } from "../src/shared/model.ts";

const numeric = (over: Partial<Subject> = {}): Subject => ({ id: "n", name: "Math", kind: "numeric", min: 0, max: 20, step: 0.25, ...over });
const cat: Subject = { id: "c", name: "Behavior", kind: "categorical", options: ["Excellent", "Good"] };

test("parseNumber accepts Latin, Persian and Arabic-Indic digits and separators", () => {
  assert.equal(parseNumber("17.5"), 17.5);
  assert.equal(parseNumber("۱۷٫۵"), 17.5);
  assert.equal(parseNumber("١٧,٥"), 17.5);
  assert.equal(parseNumber(" 20 "), 20);
  for (const bad of ["", "abc", "1.2.3", "--1", "1e5", "٫"]) assert.equal(parseNumber(bad), null, bad);
  assert.equal(normalizeNumberText("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
});

test('empty and "-" mean no grade', () => {
  for (const v of ["", " ", "-", undefined]) assert.equal(isNoGrade(v), true);
  for (const v of ["0", "Excellent", "--"]) assert.equal(isNoGrade(v), false);
});

test("numeric grades respect min, max and increment", () => {
  const s = numeric();
  assert.equal(validateGrade(s, "17.25"), null);
  assert.equal(validateGrade(s, "0"), null);
  assert.equal(validateGrade(s, "20"), null);
  assert.equal(validateGrade(s, "20.25"), "outOfRange");
  assert.equal(validateGrade(s, "-1"), "outOfRange");
  assert.equal(validateGrade(s, "17.1"), "badStep");
  assert.equal(validateGrade(s, "x"), "notNumber");
  assert.equal(validateGrade(s, "-"), null);
  assert.equal(validateGrade(s, ""), null);
});

test("increment is measured from the minimum", () => {
  const s = numeric({ min: 1, max: 10, step: 3 });
  assert.equal(validateGrade(s, "4"), null);
  assert.equal(validateGrade(s, "7"), null);
  assert.equal(validateGrade(s, "5"), "badStep");
  const f = numeric({ step: 0.1 });
  assert.equal(validateGrade(f, "0.3"), null, "floating point noise must not reject 0.3");
});

test("unconstrained numeric subjects (Excel import) accept any number", () => {
  const s: Subject = { id: "x", name: "X", kind: "numeric" };
  assert.equal(validateGrade(s, "1234.5"), null);
  assert.equal(validateGrade(s, "-3"), null);
});

test("categorical grades must come from the option list", () => {
  assert.equal(validateGrade(cat, "Good"), null);
  assert.equal(validateGrade(cat, "good"), "notInOptions");
  assert.equal(validateGrade(cat, "-"), null);
});

test("only numeric grades count toward total and average", () => {
  const subjects = [numeric({ id: "a" }), numeric({ id: "b" }), numeric({ id: "d" }), cat];
  const st: Student = { name: "A", grades: { a: "18", b: "-", d: "15.5", unknown: "99", [cat.id]: "Excellent" } };
  const s = summarize(st, subjects);
  assert.equal(s.count, 2);
  assert.equal(s.total, 33.5);
  assert.equal(s.average, 16.75);
  assert.deepEqual(summarize({ name: "B", grades: { [cat.id]: "Good" } }, subjects), { total: 0, count: 0, average: 0 });
});

test("subject definitions are validated", () => {
  const ok = validateSubjects([numeric({ id: "1", name: "Math" }), { ...cat, id: "2" }]);
  assert.deepEqual(ok, {});

  const bad = validateSubjects([
    numeric({ id: "1", name: "" }),
    numeric({ id: "2", name: "Sci", min: 5, max: 5 }),
    numeric({ id: "3", name: "Art", step: 0 }),
    numeric({ id: "4", name: "PE", min: 0, max: 2, step: 5 }),
    numeric({ id: "5", name: "Hist", min: undefined }),
    { id: "6", name: "Beh", kind: "categorical", options: [] },
    numeric({ id: "7", name: "sci" }),
  ]);
  assert.equal(bad["1"].name, "required");
  assert.equal(bad["2"].max, "minMax");
  assert.equal(bad["3"].step, "invalid");
  assert.equal(bad["4"].step, "tooLarge");
  assert.equal(bad["5"].min, "invalid");
  assert.equal(bad["6"].options, "required");
  assert.equal(bad["2"].name, "duplicate", "names are compared case-insensitively");
  assert.equal(bad["7"].name, "duplicate");
});
