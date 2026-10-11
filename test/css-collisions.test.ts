import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const classes = (file: string): Set<string> => {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
  return new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]).filter((c) => !/^\d/.test(c)));
};

test("report.css classes never collide with app.css classes", () => {
  const report = classes("static/css/report.css");
  const app = classes("static/css/app.css");
  const shared = [...report].filter((c) => app.has(c));
  // "sheet"-level helpers are intentionally absent from app.css; any overlap is a styling bug waiting to happen
  assert.deepEqual(shared, [], `shared class names: ${shared.join(", ")}`);
});
