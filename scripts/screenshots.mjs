// Generates the README screenshots with a real browser.
//   CHROME_PATH=/path/to/chrome node scripts/screenshots.mjs [outDir]
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH;
if (!CHROME) throw new Error("Set CHROME_PATH");
const OUT = process.argv[2] ?? "docs/screenshots";
mkdirSync(OUT, { recursive: true });
const PORT = 19000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ["dist/server/main.js", "--port", String(PORT), "--no-open"], { env: { ...process.env, QUIET: "1" }, stdio: "ignore" });
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${PORT}/api/health`)).ok) break; } catch {} await sleep(100); }

const DATA = {
  en: {
    info: { school: "Lincoln Memorial High School", grade: "Grade 7", className: "7-A" },
    subjects: ["Mathematics", "Science", "English", "History", "Geography", "Art", "Physical Education"],
    cat: { name: "Behavior", options: ["Excellent", "Good", "Needs improvement"] },
    names: ["Alice Johnson", "Brian Smith", "Carla Gomez", "Daniel Lee", "Emma Wilson", "Farid Karimi", "Grace Kim", "Hugo Martin", "Isla Brown", "Jack Davis", "Kira Novak", "Liam Evans"],
  },
  fa: {
    info: { school: "دبیرستان نمونهٔ شهید بهشتی", grade: "هفتم", className: "۷-الف" },
    subjects: ["ریاضی", "علوم تجربی", "ادبیات فارسی", "زبان انگلیسی", "مطالعات اجتماعی", "هنر", "تربیت بدنی"],
    cat: { name: "انضباط", options: ["عالی", "خوب", "نیاز به تلاش"] },
    names: ["علی رضایی", "سارا احمدی", "محمد کریمی", "زهرا صادقی", "حسین موسوی", "مریم حسینی", "رضا نوری", "نگار عباسی", "امیر طاهری", "نیلوفر شریفی", "پارسا قاسمی", "هانیه کاظمی"],
  },
};

function seed(lang) {
  const d = DATA[lang];
  const subjects = d.subjects.map((name, i) => ({ id: "s" + i, name, kind: "numeric", min: 0, max: 20, step: 0.25 }));
  subjects.push({ id: "sb", name: d.cat.name, kind: "categorical", options: d.cat.options });
  const students = d.names.map((name, k) => ({
    name,
    grades: { ...Object.fromEntries(subjects.slice(0, -1).map((s, i) => [s.id, String(14 + ((k * 7 + i * 5) % 24) / 4)])), sb: d.cat.options[k % 3 === 2 ? 1 : 0] },
  }));
  return { info: d.info, subjects, students };
}

const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-gpu"], headless: process.env.CHROME_HEADLESS === "shell" ? "shell" : true });
try {
  for (const lang of ["en", "fa"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1.5 });
    await page.evaluateOnNewDocument((l) => localStorage.setItem("lang", l), lang);
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const sfx = lang === "en" ? "" : "-fa";

    if (lang === "en") {
      await page.screenshot({ path: `${OUT}/01-home.png` });
    }
    const set = async (route, extra = {}) => {
      await page.evaluate((s, route, extra) => {
        const { state } = window.__rcs;
        state.flow = "manual";
        state.info = s.info; state.subjects = s.subjects; state.students = s.students; state.excelParsed = false;
        if (extra.template) localStorage.setItem("rcs.report", JSON.stringify(extra));
        location.hash = "#" + route; window.__rcs.render();
      }, seed(lang), route, extra);
      await sleep(250);
      await page.evaluate(() => document.fonts.ready);
    };

    if (lang === "en") {
      await set("/manual/subjects");
      await page.screenshot({ path: `${OUT}/02-subjects.png`, clip: { x: 0, y: 0, width: 1280, height: 860 } });
      await set("/manual/grades");
      await page.screenshot({ path: `${OUT}/03-grades.png` });
    }
    for (const [tpl, theme] of [["professional", "ocean"], ["minimal", "graphite"], ["playful", "sunset"]]) {
      await set("/report", { template: tpl, theme });
      if (lang === "en" || tpl === "professional") {
        if (lang === "en") await page.screenshot({ path: `${OUT}/04-report-ui-${tpl}.png`, clip: { x: 0, y: 0, width: 1280, height: 860 } });
        const sheet = await page.$(".sheet");
        await sheet.screenshot({ path: `${OUT}/sheet-${tpl}${sfx}.png` });
      }
    }
    if (lang === "fa") {
      await set("/report", { template: "professional", theme: "ocean" });
      await page.screenshot({ path: `${OUT}/05-report-ui-fa.png`, clip: { x: 0, y: 0, width: 1280, height: 860 } });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log("screenshots written to", OUT);
