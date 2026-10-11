import { isNoGrade, Student } from "../../shared/model";
import { h } from "../dom";
import { icon } from "../icons";
import { t } from "../i18n";
import { button } from "../layout";
import { renderCard } from "../report/cards";
import { fitRow, resolvePerSheet, sheetGeometry, SummaryMode, TemplateId, TEMPLATES } from "../report/geometry";
import { Theme, themeById, themeVars, THEMES } from "../report/themes";
import { resetAll, state } from "../state";

export interface ReportOptions {
  template: TemplateId;
  theme: string;
  perSheet: number | "auto";
  summary: "auto" | SummaryMode;
}

const STORE_KEY = "rcs.report";
const TEMPLATE_IDS: TemplateId[] = ["minimal", "professional", "playful"];

function loadOptions(): ReportOptions {
  const o: ReportOptions = { template: "professional", theme: "ocean", perSheet: "auto", summary: "auto" };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    if (TEMPLATE_IDS.includes(saved.template)) o.template = saved.template;
    if (THEMES.some((th) => th.id === saved.theme)) o.theme = saved.theme;
  } catch {
    /* storage unavailable or corrupt: use defaults */
  }
  return o;
}

function saveOptions(o: ReportOptions): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ template: o.template, theme: o.theme }));
  } catch {
    /* ignore */
  }
}

/** Effective summary mode: honours the user's choice, and is "none" when no subject is numeric. */
export function effectiveSummary(o: ReportOptions): SummaryMode {
  if (!state.subjects.some((s) => s.kind === "numeric")) return "none";
  return o.summary === "auto" ? TEMPLATES[o.template].defaultSummary : o.summary;
}

function applyVars(el: HTMLElement, theme: Theme): void {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}

/** Builds the A4 sheets for the current options. */
export function buildSheets(students: Student[], o: ReportOptions): { sheets: HTMLElement[]; perSheet: number } {
  const spec = TEMPLATES[o.template];
  const summary = effectiveSummary(o);
  const n = state.subjects.length;
  const perSheet = resolvePerSheet(spec, o.perSheet, n, summary);
  const geo = sheetGeometry(spec, perSheet);
  const { r } = fitRow(spec, perSheet, n, summary);
  const theme = themeById(o.theme);
  const ctx = { info: state.info, subjects: state.subjects, summary, r, cellW: geo.cellW, theme };

  const sheets: HTMLElement[] = [];
  for (let i = 0; i < students.length; i += perSheet) {
    const grid = h("div", {
      class: "sheet-grid",
      style: `grid-template-columns:repeat(${geo.cols},minmax(0,1fr));grid-auto-rows:${geo.cellH.toFixed(3)}mm;gap:${geo.gap}mm`,
    });
    students.slice(i, i + perSheet).forEach((st, j) => {
      const row = Math.floor(j / geo.cols);
      const col = j % geo.cols;
      const cut = o.template === "minimal" ? ` cell-cut${row === 0 ? " cut-top" : ""}${col === 0 ? " cut-start" : ""}` : "";
      grid.appendChild(h("div", { class: `cell cell-${o.template}${cut}` }, renderCard(o.template, st, ctx)));
    });
    const sheet = h("div", { class: `sheet sheet-${o.template}${perSheet > 1 ? " multi" : ""}`, style: `padding:${geo.margin}mm` }, grid);
    applyVars(sheet, theme);
    sheets.push(sheet);
  }
  return { sheets, perSheet };
}

// ------------------------------------------------------------- thumbnails
const THUMBS: Record<TemplateId, string> = {
  minimal: `<svg viewBox="0 0 48 62" width="48" height="62" aria-hidden="true"><rect x=".5" y=".5" width="47" height="61" rx="2" fill="#fff" stroke="#c5cdd9"/>${[0, 1, 2]
    .flatMap((r) => [0, 1].map((c) => `<g transform="translate(${5 + c * 20} ${5 + r * 18})"><rect width="12" height="2.4" rx="1" style="fill:var(--dark)"/><rect y="4" width="7" height="1.6" rx=".8" fill="#9aa5b5"/><rect y="8" width="18" height="1.2" fill="#d6dce6"/><rect y="11" width="18" height="1.2" fill="#d6dce6"/><rect y="14" width="18" height="1.2" fill="#d6dce6"/></g>`))
    .join("")}</svg>`,
  professional: `<svg viewBox="0 0 48 62" width="48" height="62" aria-hidden="true"><rect x=".5" y=".5" width="47" height="61" rx="2" fill="#fff" stroke="#c5cdd9"/>${[0, 1]
    .map(
      (r) =>
        `<g transform="translate(5 ${5 + r * 28})"><rect width="38" height="24" rx="1.5" fill="#fff" stroke="#8b95a5" stroke-width=".6"/><rect x="1" y="1" width="36" height="5" style="fill:var(--primary)"/><rect x="3" y="9" width="32" height="1.6" fill="#d6dce6"/><rect x="3" y="12.5" width="32" height="1.6" style="fill:var(--soft)"/><rect x="3" y="16" width="32" height="1.6" fill="#d6dce6"/><circle cx="7" cy="21" r="2" fill="none" stroke="#8b95a5" stroke-width=".5"/><rect x="14" y="21" width="9" height=".6" fill="#8b95a5"/><rect x="26" y="21" width="9" height=".6" fill="#8b95a5"/></g>`,
    )
    .join("")}</svg>`,
  playful: `<svg viewBox="0 0 48 62" width="48" height="62" aria-hidden="true"><rect x=".5" y=".5" width="47" height="61" rx="2" fill="#fff" stroke="#c5cdd9"/>${[0, 1]
    .map(
      (r) =>
        `<g transform="translate(5 ${5 + r * 28})"><rect width="38" height="24" rx="5" style="fill:var(--soft);stroke:var(--primary)" stroke-width="1"/><rect x="11" y="3" width="16" height="3" rx="1.5" style="fill:var(--primary)"/>${[0, 1, 2]
          .map((i) => `<g transform="translate(4 ${9 + i * 4.6})"><rect width="30" height="3.6" rx="1.8" fill="#fff"/><circle cx="2" cy="1.8" r="1" style="fill:var(--k${i + 1})"/><circle cx="27.4" cy="1.8" r="1.5" style="fill:var(--k${i + 1})"/></g>`)
          .join("")}</g>`,
    )
    .join("")}</svg>`,
};

function thumb(id: TemplateId): HTMLElement {
  const el = h("span", { class: "tpl-thumb" });
  el.innerHTML = THUMBS[id];
  return el;
}

// ------------------------------------------------------------------- PDF
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function downloadPDF(pagesEl: HTMLElement): Promise<void> {
  const overlay = h(
    "div",
    { class: "overlay" },
    h("div", { class: "overlay-box" }, h("div", { class: "spinner" }), h("strong", null, t("report.pdfBusy")), h("span", { class: "muted" }, t("report.pdfWait"))),
  );
  document.body.appendChild(overlay);
  try {
    await loadScript("/static/js/html2canvas.min.js");
    await loadScript("/static/js/jspdf.umd.min.js");
    const w = window as unknown as {
      html2canvas: (el: HTMLElement, o: object) => Promise<HTMLCanvasElement>;
      jspdf: { jsPDF: new (o: string, u: string, f: string) => any };
    };
    const pdf = new w.jspdf.jsPDF("p", "mm", "a4");
    const sheets = Array.from(pagesEl.querySelectorAll<HTMLElement>(".sheet"));
    for (let i = 0; i < sheets.length; i++) {
      const canvas = await w.html2canvas(sheets[i], { scale: 2.5, useCORS: true, backgroundColor: "#ffffff", logging: false });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, 210, 297);
    }
    pdf.save("report-cards.pdf");
  } catch (e) {
    console.error(e);
    alert(t("report.pdfFail"));
  } finally {
    overlay.remove();
  }
}

// ------------------------------------------------------------------ view
export function reportView(go: (path: string) => void): HTMLElement {
  const students = state.students;
  const opts = loadOptions();

  const pagesEl = h("div", { class: "pages" });
  const controls = h("section", { class: "report-controls no-print" });
  const sheetInfo = h("span", { class: "muted" });

  function refresh(): void {
    const { sheets, perSheet } = buildSheets(students, opts);
    pagesEl.replaceChildren(...sheets);
    sheetInfo.textContent = sheets.length === 1 ? t("report.sheet1", { n: students.length }) : t("report.sheets", { n: students.length, p: sheets.length });
    renderControls(perSheet);
  }

  function renderControls(autoPerSheet: number): void {
    const spec = TEMPLATES[opts.template];
    const summary = effectiveSummary(opts);
    const n = state.subjects.length;
    applyVars(controls, themeById(opts.theme));

    const templateCards = h(
      "div",
      { class: "tpl-grid", role: "radiogroup", "aria-label": t("report.template") },
      TEMPLATE_IDS.map((id) =>
        h(
          "button",
          {
            type: "button",
            class: "tpl-card" + (opts.template === id ? " active" : ""),
            role: "radio",
            "aria-checked": String(opts.template === id),
            onclick: () => {
              opts.template = id;
              if (opts.perSheet !== "auto" && !TEMPLATES[id].options.includes(opts.perSheet)) opts.perSheet = "auto";
              saveOptions(opts);
              refresh();
            },
          },
          thumb(id),
          h("span", { class: "tpl-text" }, h("strong", null, t(`tpl.${id}`)), h("small", null, t(`tpl.${id}.desc`))),
        ),
      ),
    );

    const swatches = h(
      "div",
      { class: "swatches", role: "radiogroup", "aria-label": t("report.theme") },
      THEMES.map((th) =>
        h("button", {
          type: "button",
          class: "swatch" + (opts.theme === th.id ? " active" : ""),
          role: "radio",
          "aria-checked": String(opts.theme === th.id),
          title: t(`theme.${th.id}`),
          "aria-label": t(`theme.${th.id}`),
          style: `background:linear-gradient(135deg,${th.primary} 55%,${th.accent} 55%)`,
          onclick: () => {
            opts.theme = th.id;
            saveOptions(opts);
            refresh();
          },
        }),
      ),
    );

    const perSheetSelect = h(
      "select",
      {
        class: "input select",
        "aria-label": t("report.perSheet"),
        onchange: (e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          opts.perSheet = v === "auto" ? "auto" : Number(v);
          refresh();
        },
      },
      h("option", { value: "auto", selected: opts.perSheet === "auto" }, t("opt.auto", { n: autoPerSheet })),
      spec.options.map((p) => {
        const ok = fitRow(spec, p, n, summary).fits;
        return h("option", { value: String(p), disabled: !ok, selected: opts.perSheet === p }, t("opt.perSheet", { n: p }) + (ok ? "" : ` \u2014 ${t("opt.tooSmall")}`));
      }),
    );

    const summarySelect = h(
      "select",
      {
        class: "input select",
        "aria-label": t("report.summary"),
        disabled: !state.subjects.some((s) => s.kind === "numeric"),
        onchange: (e: Event) => {
          opts.summary = (e.target as HTMLSelectElement).value as ReportOptions["summary"];
          refresh();
        },
      },
      (["auto", "none", "average", "both"] as const).map((m) => h("option", { value: m, selected: opts.summary === m }, m === "auto" ? t("summary.default") : t(`summary.${m}`))),
    );

    controls.replaceChildren(
      h("div", { class: "ctl ctl-templates" }, h("label", { class: "label" }, t("report.template")), templateCards),
      h(
        "div",
        { class: "ctl-side" },
        h("div", { class: "ctl" }, h("label", { class: "label" }, t("report.theme")), swatches),
        h("div", { class: "ctl" }, h("label", { class: "label" }, t("report.perSheet")), perSheetSelect),
        h("div", { class: "ctl" }, h("label", { class: "label" }, t("report.summary")), summarySelect),
      ),
    );
  }

  const backPath = state.flow === "excel" ? "/excel/review" : "/manual/grades";
  const toolbar = h(
    "div",
    { class: "report-toolbar no-print" },
    h("div", { class: "report-title" }, h("h1", null, t("report.title")), sheetInfo),
    h(
      "div",
      { class: "toolbar-actions" },
      button(t("common.back"), "secondary", () => go(backPath), { icon: "back" }),
      button(
        t("report.restart"),
        "ghost",
        () => {
          if (confirm(t("report.confirmRestart"))) {
            resetAll();
            go("/");
          }
        },
        { icon: "restart" },
      ),
      button(t("report.print"), "secondary", () => window.print(), { icon: "printer" }),
      button(t("report.pdf"), "primary", () => void downloadPDF(pagesEl), { icon: "download" }),
    ),
  );
  void icon;
  void isNoGrade;

  refresh();
  return h("section", { class: "report-view" }, toolbar, controls, h("div", { class: "report-scroll" }, pagesEl));
}
