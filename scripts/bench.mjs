// Reproducible benchmarks.  Build first (npm run build), then:
//   node scripts/bench.mjs                              # server-side benchmarks only
//   CHROME_PATH=/path/to/chrome node scripts/bench.mjs  # + in-browser rendering / PDF benchmarks
//   BINARY=release/report-card-studio-linux-x64 node scripts/bench.mjs   # + standalone executable startup
// Writes a JSON report to bench-results.json and prints Markdown tables.
import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");
const { parseExcel } = require("../dist/server/excel.js");

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((a.length * p) / 100))];
const fmt = (n, d = 1) => Number(n).toFixed(d);
const results = { env: {}, excel: [], server: {}, render: [], pdf: [], bundle: {}, binary: null };

results.env = {
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0].model.trim(),
  cores: os.cpus().length,
  memGB: Math.round(os.totalmem() / 2 ** 30),
  node: process.version,
};

// ------------------------------------------------------------ Excel parsing
async function makeWorkbook(students, subjects = 15) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Grades");
  ws.addRow([null, ...Array.from({ length: subjects }, (_, i) => (i === subjects - 1 ? "Behavior" : `Subject ${i + 1}`))]);
  for (let s = 0; s < students; s++) {
    ws.addRow([`Student ${s + 1}`, ...Array.from({ length: subjects }, (_, i) => (i === subjects - 1 ? ["Excellent", "Good", "Fair"][s % 3] : ((s * 7 + i * 3) % 80) / 4))]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

for (const students of [100, 1000, 5000]) {
  const buf = await makeWorkbook(students);
  await parseExcel(buf); // warm-up
  const times = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    await parseExcel(buf);
    times.push(performance.now() - t);
  }
  results.excel.push({ students, subjects: 15, fileKB: Math.round(buf.length / 1024), medianMs: median(times), studentsPerSec: Math.round(students / (median(times) / 1000)) });
}

// ------------------------------------------------------------------- server
async function waitHealthy(port, timeout = 15000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return performance.now() - t0;
    } catch {}
    await sleep(15);
  }
  throw new Error("server did not start");
}
const rssMB = (pid) => Number(execFileSync("ps", ["-o", "rss=", "-p", String(pid)]).toString().trim()) / 1024;

async function measureStartup(cmd, args, port) {
  const t0 = performance.now();
  const child = spawn(cmd, [...args, "--port", String(port), "--no-open"], { env: { ...process.env, QUIET: "1" }, stdio: "ignore" });
  await waitHealthy(port);
  const startMs = performance.now() - t0;
  await sleep(300);
  return { child, startMs, rss: rssMB(child.pid) };
}

{
  const port = 20100 + Math.floor(Math.random() * 400);
  const { child, startMs, rss } = await measureStartup(process.execPath, ["dist/server/main.js"], port);
  const base = `http://127.0.0.1:${port}`;
  const lat = async (url, n = 300) => {
    const ts = [];
    for (let i = 0; i < n; i++) {
      const t = performance.now();
      await (await fetch(url)).arrayBuffer();
      ts.push(performance.now() - t);
    }
    return { p50: median(ts), p95: pct(ts, 95) };
  };
  const health = await lat(`${base}/api/health`);
  const home = await lat(`${base}/`);
  const js = await lat(`${base}/static/js/app.js`, 100);
  const buf1000 = await makeWorkbook(1000);
  const upT = [];
  for (let i = 0; i < 5; i++) {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(buf1000)]), "grades.xlsx");
    const t = performance.now();
    await (await fetch(`${base}/api/excel/parse`, { method: "POST", body: fd })).json();
    upT.push(performance.now() - t);
  }
  results.server = { startMs, rssMB: rss, health, home, appJs: js, upload1000Ms: median(upT) };
  child.kill();
  await sleep(200);
}

// ------------------------------------------------------------------ bundles
{
  const js = readFileSync("static/js/app.js");
  const css = readFileSync("static/css/app.css");
  const rcss = readFileSync("static/css/report.css");
  results.bundle = {
    appJsKB: js.length / 1024,
    appJsGzKB: gzipSync(js).length / 1024,
    cssKB: (css.length + rcss.length) / 1024,
    cssGzKB: gzipSync(Buffer.concat([css, rcss])).length / 1024,
  };
}

// ------------------------------------------------------ standalone binary
if (process.env.BINARY) {
  const port = 20600 + Math.floor(Math.random() * 300);
  const { child, startMs, rss } = await measureStartup(process.env.BINARY, [], port);
  results.binary = { file: process.env.BINARY, sizeMB: statSync(process.env.BINARY).size / 2 ** 20, startMs, rssMB: rss };
  child.kill();
}

// ----------------------------------------------------------------- browser
if (process.env.CHROME_PATH) {
  const puppeteer = (await import("puppeteer-core")).default;
  const port = 20900 + Math.floor(Math.random() * 300);
  const server = spawn(process.execPath, ["dist/server/main.js", "--port", String(port), "--no-open"], { env: { ...process.env, QUIET: "1" }, stdio: "ignore" });
  await waitHealthy(port);
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--disable-gpu"], headless: process.env.CHROME_HEADLESS === "shell" ? "shell" : true });
  results.env.chrome = await browser.version();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(() => document.fonts.ready);

  const setup = (n, template) =>
    page.evaluate(
      (n, template) => {
        const r = window.__rcs;
        r.state.info = { school: "Lincoln Memorial High School", grade: "Grade 7", className: "7-A" };
        r.state.subjects = Array.from({ length: 10 }, (_, i) => ({ id: "s" + i, name: "Subject " + (i + 1), kind: "numeric", min: 0, max: 20, step: 0.25 }));
        window.__students = Array.from({ length: n }, (_, k) => ({ name: "Student " + (k + 1), grades: Object.fromEntries(r.state.subjects.map((s, i) => [s.id, String(((k * 7 + i * 3) % 80) / 4)])) }));
        window.__opts = { template, theme: "ocean", perSheet: "auto", summary: "auto" };
      },
      n,
      template,
    );

  for (const template of ["minimal", "professional", "playful"]) {
    for (const n of [30, 300, 3000]) {
      await setup(n, template);
      const runs = [];
      for (let i = 0; i < 3; i++) {
        runs.push(
          await page.evaluate(async () => {
            const r = window.__rcs;
            document.getElementById("bench")?.remove();
            const t0 = performance.now();
            const { sheets, perSheet } = r.buildSheets(window.__students, window.__opts);
            const t1 = performance.now();
            const holder = document.createElement("div");
            holder.id = "bench";
            holder.style.cssText = "position:absolute;left:0;top:0;opacity:0";
            holder.append(...sheets);
            document.body.append(holder);
            holder.getBoundingClientRect();
            const t2 = performance.now();
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
            const t3 = performance.now();
            return { build: t1 - t0, layout: t2 - t1, paint: t3 - t2, sheets: sheets.length, perSheet, nodes: holder.querySelectorAll("*").length };
          }),
        );
      }
      const best = runs.slice(1);
      results.render.push({ template, students: n, sheets: runs[0].sheets, perSheet: runs[0].perSheet, buildMs: median(best.map((x) => x.build)), layoutMs: median(best.map((x) => x.layout)), paintMs: median(best.map((x) => x.paint)), nodes: runs[0].nodes });
    }
  }

  // Chromium print-to-PDF: what the "Print" button produces (vector output).
  for (const template of ["minimal", "professional"]) {
    for (const n of [30, 300]) {
      await setup(n, template);
      await page.evaluate(() => {
        document.getElementById("bench")?.remove();
        const { sheets } = window.__rcs.buildSheets(window.__students, window.__opts);
        document.body.innerHTML = "";
        const holder = document.createElement("div");
        holder.append(...sheets);
        document.body.append(holder);
      });
      const t = performance.now();
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      const ms = performance.now() - t;
      const sheets = await page.evaluate(() => document.querySelectorAll(".sheet").length);
      results.pdf.push({ template, students: n, sheets, ms, sizeKB: pdf.length / 1024 });
      await page.goto(`http://localhost:${port}/`);
      await page.evaluate(() => document.fonts.ready);
    }
  }
  await browser.close();
  server.kill();
}

writeFileSync("bench-results.json", JSON.stringify(results, null, 2));

// ----------------------------------------------------------------- markdown
const e = results.env;
console.log(`\nEnvironment: ${e.cpu} x${e.cores}, ${e.memGB} GB RAM, ${e.os}, Node ${e.node}${e.chrome ? `, ${e.chrome}` : ""}\n`);
console.log("| Students x subjects | File size | Parse time (median of 5) | Throughput |\n|---|---|---|---|");
for (const r of results.excel) console.log(`| ${r.students.toLocaleString("en")} x ${r.subjects} | ${r.fileKB} KB | ${fmt(r.medianMs, 0)} ms | ${r.studentsPerSec.toLocaleString("en")} students/s |`);
const s = results.server;
console.log(`\nServer: start ${fmt(s.startMs, 0)} ms, RSS ${fmt(s.rssMB, 0)} MB, /api/health p50 ${fmt(s.health.p50, 2)} ms (p95 ${fmt(s.health.p95, 2)}), / p50 ${fmt(s.home.p50, 2)} ms, app.js p50 ${fmt(s.appJs.p50, 2)} ms, upload+parse 1000 rows ${fmt(s.upload1000Ms, 0)} ms`);
const b = results.bundle;
console.log(`Bundles: app.js ${fmt(b.appJsKB)} KB (${fmt(b.appJsGzKB)} KB gzip), CSS ${fmt(b.cssKB)} KB (${fmt(b.cssGzKB)} KB gzip)`);
if (results.binary) console.log(`Binary: ${fmt(results.binary.sizeMB)} MB, start ${fmt(results.binary.startMs, 0)} ms, RSS ${fmt(results.binary.rssMB, 0)} MB`);
if (results.render.length) {
  console.log("\n| Template | Students | Sheets | Per sheet | Build | Layout | Paint | DOM nodes |\n|---|---|---|---|---|---|---|---|");
  for (const r of results.render) console.log(`| ${r.template} | ${r.students.toLocaleString("en")} | ${r.sheets} | ${r.perSheet} | ${fmt(r.buildMs, 0)} ms | ${fmt(r.layoutMs, 0)} ms | ${fmt(r.paintMs, 0)} ms | ${r.nodes.toLocaleString("en")} |`);
  console.log("\n| Template | Students | Sheets | Print-to-PDF time | PDF size |\n|---|---|---|---|---|");
  for (const r of results.pdf) console.log(`| ${r.template} | ${r.students} | ${r.sheets} | ${fmt(r.ms / 1000, 1)} s | ${fmt(r.sizeKB / 1024, 2)} MB |`);
}
