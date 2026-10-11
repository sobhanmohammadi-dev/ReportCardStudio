// Renders brand assets (PNG logos, favicon.ico, social banner) from assets/logo-mark.svg with a real browser.
//   CHROME_PATH=/path/to/chrome node scripts/make-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH;
if (!CHROME) throw new Error("Set CHROME_PATH");
const mark = readFileSync("assets/logo-mark.svg", "utf8");
const b64 = (f) => readFileSync(f).toString("base64");

const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-gpu"], headless: process.env.CHROME_HEADLESS === "shell" ? "shell" : true });
const page = await browser.newPage();

async function renderMark(size) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${mark.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  return page.screenshot({ omitBackground: true, type: "png" });
}

const png512 = await renderMark(512);
writeFileSync("assets/logo-512.png", png512);
writeFileSync("assets/logo-192.png", await renderMark(192));
writeFileSync("static/ico/favicon-32.png", await renderMark(32));

// ICO container with embedded PNG images (supported by every modern browser and Windows).
const sizes = [16, 32, 48, 64];
const images = [];
for (const s of sizes) images.push(await renderMark(s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync("static/ico/favicon.ico", Buffer.concat([header, ...entries, ...images]));

// Social preview / README banner (1280x640) built from the real template screenshots.
await page.setViewport({ width: 1280, height: 640 });
await page.setContent(`<!doctype html><html><body style="margin:0;width:1280px;height:640px;overflow:hidden;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;background:radial-gradient(1200px 700px at 85% 10%,#2750c9 0%,#14295e 45%,#0a1530 100%);position:relative;color:#fff">
  <div style="position:absolute;left:84px;top:96px;width:560px">
    <div style="display:flex;align-items:center;gap:22px"><img src="data:image/png;base64,${b64("assets/logo-192.png")}" width="104" height="104" style="filter:drop-shadow(0 8px 18px rgba(0,0,0,.45))"/>
      <div style="font-size:54px;font-weight:800;line-height:1.02;letter-spacing:-1px">Report Card<br/><span style="color:#8fb4ff">Studio</span></div></div>
    <div style="margin-top:34px;font-size:27px;line-height:1.35;color:#d3def8">Print-perfect report cards for any class.<br/>Excel import, 3 templates, 6 themes.</div>
    <div style="margin-top:34px;display:flex;gap:12px;flex-wrap:wrap;font-size:19px;font-weight:600">
      ${["English + فارسی (RTL)", "Windows · macOS · Linux", "Works offline"].map((x) => `<span style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)">${x}</span>`).join("")}
    </div>
  </div>
  ${[["sheet-minimal", 700, 120, 7, 0.52], ["sheet-playful", 842, 70, 0, 0.58], ["sheet-professional", 985, 112, -7, 0.52]]
    .map(([f, x, y, rot, sc]) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${Math.round(210 * 6 * sc)}px;height:${Math.round(297 * 6 * sc)}px;transform:rotate(${rot}deg);box-shadow:0 22px 50px rgba(0,0,0,.55);border-radius:6px;overflow:hidden;background:#fff"><img src="data:image/png;base64,${b64(`docs/screenshots/${f}.png`)}" style="width:100%;height:100%;display:block"/></div>`).join("")}
</body></html>`);
await page.screenshot({ path: "assets/banner.png", type: "png" });
await browser.close();
console.log("assets written");
