import assert from "node:assert/strict";
import { test } from "node:test";
import { autoPerSheet, fitRow, SHEET, sheetGeometry, SummaryMode, TEMPLATES, TemplateId } from "../src/client/report/geometry.ts";

const ids = Object.keys(TEMPLATES) as TemplateId[];
const modes: SummaryMode[] = ["none", "average", "both"];

test("every grid exactly tiles the printable area of an A4 sheet", () => {
  for (const id of ids) {
    const spec = TEMPLATES[id];
    for (const p of spec.options) {
      const g = sheetGeometry(spec, p);
      assert.equal(g.cols * g.rows, p, `${id}/${p}: grid does not hold ${p} cards`);
      assert.ok(Math.abs(g.cols * g.cellW + (g.cols - 1) * g.gap + 2 * g.margin - SHEET.w) < 1e-9);
      assert.ok(Math.abs(g.rows * g.cellH + (g.rows - 1) * g.gap + 2 * g.margin - SHEET.h) < 1e-9);
    }
  }
});

test("a card never exceeds its cell, for any template, layout and subject count", () => {
  for (const id of ids) {
    const spec = TEMPLATES[id];
    for (const p of spec.options) {
      const cell = sheetGeometry(spec, p).cellH;
      for (let n = 1; n <= 60; n++) {
        for (const m of modes) {
          const f = fitRow(spec, p, n, m);
          assert.ok(f.r > 0 && f.r <= spec.rMax(p) + 1e-9, `${id}/${p}/${n}: bad row ${f.r}`);
          if (f.r > 1) assert.ok(f.height <= cell + 1e-6, `${id}/${p}/${n}/${m}: card ${f.height}mm > cell ${cell}mm`);
        }
      }
    }
  }
});

test("auto picks readable layouts, and more subjects never mean more cards per sheet", () => {
  for (const id of ids) {
    const spec = TEMPLATES[id];
    for (const m of modes) {
      let previous = Infinity;
      for (let n = 1; n <= 30; n++) {
        const p = autoPerSheet(spec, n, m);
        assert.ok(spec.options.includes(p));
        const f = fitRow(spec, p, n, m);
        assert.ok(f.rFit >= spec.rAuto || p === spec.options[0], `${id}/${n}/${m}: auto chose unreadable ${p} (${f.rFit.toFixed(2)}mm)`);
        assert.ok(p <= previous, `${id}/${m}: ${n} subjects picked ${p} > ${previous}`);
        previous = p;
      }
    }
  }
});

test("minimal packs many cards per sheet for typical classes", () => {
  const spec = TEMPLATES.minimal;
  assert.ok(autoPerSheet(spec, 6, "none") >= 15);
  assert.ok(autoPerSheet(spec, 12, "none") >= 8);
  assert.ok(autoPerSheet(spec, 3, "none") >= 18);
});

test("row heights never drop below the readable minimum when a layout is reported as fitting", () => {
  for (const id of ids) {
    const spec = TEMPLATES[id];
    for (const p of spec.options) for (let n = 1; n <= 30; n++) {
      const f = fitRow(spec, p, n, spec.defaultSummary);
      assert.equal(f.fits, f.rFit >= spec.rMin);
      if (f.fits) assert.ok(f.r >= spec.rMin);
    }
  }
});
