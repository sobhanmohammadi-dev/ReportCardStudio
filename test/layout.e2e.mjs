// Browser layout verification: renders every template x cards-per-sheet x subject count x language
// in real Chromium and asserts that nothing overflows its cell or the A4 sheet.
//
//   CHROME_PATH=/path/to/chrome node test/layout.e2e.mjs
//
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH;
if (!CHROME) {
  console.error("Set CHROME_PATH to a Chrome/Chromium executable.");
  process.exit(2);
}
const PORT = 18080 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, ["dist/server/main.js", "--port", String(PORT), "--no-open"], { env: { ...process.env, QUIET: "1" }, stdio: "ignore" });
const MM = 96 / 25.4;
const TOL = 0.6 * MM; // px

const SUBJECTS_EN = ["Mathematics", "Science", "Literature", "English Language", "History", "Geography", "Physical Education", "Art and Design", "Computer Science", "Music", "Religious Studies", "Social Studies", "Chemistry", "Physics", "Biology", "Economics", "Philosophy", "Drama", "Technology", "Behavior", "Citizenship", "Statistics", "Algebra", "Geometry", "Writing"];
const SUBJECTS_FA = ["ریاضی", "علوم تجربی", "ادبیات فارسی", "زبان انگلیسی", "مطالعات اجتماعی", "تربیت بدنی", "هنر", "کار و فناوری", "قرآن", "پیام‌های آسمانی", "زبان عربی", "تفکر و سبک زندگی", "فیزیک", "شیمی", "زیست‌شناسی", "جغرافیا", "تاریخ", "انشا", "املا", "انضباط", "دفاعی", "آمار", "جبر", "هندسه", "نگارش"];
const LONG_EN = "Alexandra Montgomery-Richardson-Wellington";
const NAMES_EN = ["Bo Li", "Charlotte Evans", "Dmitri Ivanov", "Eve Adams", "Mohammad Hosseini"];
const LONG_FA = "محمدحسین عبدالرحمانی‌نژاد‌زاده‌ی بزرگ";
const NAMES_FA = ["سارا احمدی", "علی رضایی", "زهرا کریمی", "حسین صادقی", "محمدرضا عباسی‌نژاد"];

const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-gpu"], headless: process.env.CHROME_HEADLESS === "shell" ? "shell" : true });
let failures = 0, checks = 0;
const report = [];

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://localhost:${PORT}/api/health`)).ok) break; } catch {}
    await sleep(100);
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  for (const lang of ["en", "fa"]) {
    await page.evaluateOnNewDocument((l) => localStorage.setItem("lang", l), lang);
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const result = await page.evaluate(
      ({ lang, SUBJECTS_EN, SUBJECTS_FA, NAMES_EN, NAMES_FA, LONG_EN, LONG_FA, MM, TOL, BREAK }) => {
        if (BREAK) { const st = document.createElement("style"); st.textContent = ".pr-foot{height:45mm!important}.mn-class{height:12mm!important}.kd-sum{height:40mm!important}.kd-row .kd-badge{margin-top:26px!important}"; document.head.appendChild(st); }
        const rcs = window.__rcs;
        const subjectsAll = lang === "fa" ? SUBJECTS_FA : SUBJECTS_EN;
        const names = lang === "fa" ? NAMES_FA : NAMES_EN;
        const out = [];
        for (const n of [1, 3, 6, 9, 12, 15, 20, 25]) {
          const subjects = subjectsAll.slice(0, n).map((name, i) => ({ id: "s" + i, name, kind: i % 5 === 4 ? "categorical" : "numeric", min: 0, max: 20, step: 0.25, options: ["A", "B"] }));
          const grades = (k) => Object.fromEntries(subjects.map((s, i) => [s.id, s.kind === "numeric" ? String(((k * 7 + i * 3) % 80) / 4) : "A"]));
          const students = Array.from({ length: 40 }, (_, k) => ({ name: k === 0 ? (lang === "fa" ? LONG_FA : LONG_EN) : names[k % names.length] + " " + k, grades: grades(k) }));
          rcs.state.info = { school: lang === "fa" ? "دبیرستان نمونهٔ شهید بهشتی شمارهٔ دو" : "Lincoln Memorial High School of Science", grade: lang === "fa" ? "هفتم" : "Grade 7", className: "7-A" };
          rcs.state.subjects = subjects;
          for (const template of ["minimal", "professional", "playful"]) {
            const spec = rcs.TEMPLATES[template];
            for (const summary of ["auto", "none", "average", "both"]) {
              for (const perSheet of ["auto", ...spec.options]) {
                const { sheets, perSheet: per } = rcs.buildSheets(students, { template, theme: "ocean", perSheet, summary });
                const holder = document.createElement("div");
                holder.style.cssText = "position:absolute;left:0;top:0;opacity:0;pointer-events:none";
                sheets.forEach((s) => holder.appendChild(s));
                document.body.appendChild(holder);
                const problems = [];
                const first = sheets[0];
                let fillMax = 0, fillMin = 1, rowPx = 0, fontPx = 0, trunc = 0;
                for (const [si, sheet] of sheets.entries()) {
                  const sr = sheet.getBoundingClientRect();
                  if (Math.abs(sr.height - 297 * MM) > 1.5 || Math.abs(sr.width - 210 * MM) > 1.5) problems.push("sheet size");
                  const cells = [...sheet.querySelectorAll(".cell")];
                  if (si < sheets.length - 1 && cells.length !== per) problems.push(`cards on sheet ${cells.length} != ${per}`);
                  for (const cell of cells) {
                    const c = cell.getBoundingClientRect();
                    const card = cell.firstElementChild;
                    const k = card.getBoundingClientRect();
                    if (card.scrollHeight > card.clientHeight + 1.5) problems.push("card scrollHeight overflow");
                    if (k.bottom > c.bottom + TOL) problems.push(`card bottom overflow ${((k.bottom - c.bottom) / MM).toFixed(2)}mm`);
                    if (k.right > c.right + TOL || k.left < c.left - TOL) problems.push("card horizontal overflow");
                    if (c.bottom > sr.bottom - 0 + 0.5) problems.push("cell beyond sheet");
                    const fill = k.height / c.height;
                    fillMax = Math.max(fillMax, fill); fillMin = Math.min(fillMin, fill);
                    if (!(si === 0 && cells.indexOf(cell) === 0)) for (const el of card.querySelectorAll(".s, b, .kd-chip, .pr-school, .mn-name, .mn-class")) if (el.scrollWidth > el.clientWidth + 1) trunc++;
                    // every element must stay inside its own row (catches CSS collisions / mis-sized badges)
                    for (const row of card.querySelectorAll(".mn-row, .pr-row, .pr-th, .kd-row")) {
                      const rr = row.getBoundingClientRect();
                      for (const el of row.children) {
                        const e = el.getBoundingClientRect();
                        if (e.top < rr.top - 1.5 || e.bottom > rr.bottom + 1.5 || e.right > rr.right + 1.5 || e.left < rr.left - 1.5) { problems.push("element outside its row: " + el.className); break; }
                      }
                    }
                    // every child block must stay inside the card
                    for (const el of card.querySelectorAll("*")) {
                      const e = el.getBoundingClientRect();
                      if (e.height > 0 && (e.bottom > k.bottom + 1.5 || e.right > k.right + 1.5 || e.left < k.left - 1.5)) { problems.push("child outside card: " + el.className); break; }
                    }
                  }
                }
                const row = first.querySelector(".mn-row, .pr-row, .kd-row");
                if (row) { rowPx = row.getBoundingClientRect().height / MM; fontPx = parseFloat(getComputedStyle(row).fontSize) / MM; }
                out.push({ template, n, summary, perSheet: per, requested: perSheet, problems: [...new Set(problems)], fillMax, fillMin, rowMm: rowPx, fontMm: fontPx, trunc, fits: rcs.fitRow(spec, per, n, summary === "auto" ? spec.defaultSummary : summary).fits });
                holder.remove();
              }
            }
          }
        }
        return out;
      },
      { lang, SUBJECTS_EN, SUBJECTS_FA, NAMES_EN, NAMES_FA, LONG_EN, LONG_FA, MM, TOL, BREAK: process.env.LAYOUT_BREAK === "1" },
    );
    for (const r of result) {
      checks++;
      if (r.trunc > 0 && !r.problems.includes("text truncated")) r.problems.push("text truncated");
      if (r.problems.length) {
        failures++;
        if (failures <= 25) console.log(`FAIL [${lang}] ${r.template} n=${r.n} summary=${r.summary} perSheet=${r.requested}->${r.perSheet}: ${r.problems.join("; ")}`);
      }
      report.push({ lang, ...r });
    }
    console.log(`[${lang}] ${result.length} configurations checked`);
  }
  if (process.env.LAYOUT_REPORT) (await import("node:fs")).writeFileSync(process.env.LAYOUT_REPORT, JSON.stringify(report));
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures}/${checks} configurations FAILED` : `\nAll ${checks} layout configurations passed (no overflow).`);
process.exit(failures ? 1 : 0);
