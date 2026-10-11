import { displayGrade, isNoGrade, ClassInfo, Student, Subject, summarize } from "../../shared/model";
import { h } from "../dom";
import { t } from "../i18n";
import { SummaryMode, TemplateId } from "./geometry";
import { Theme } from "./themes";

export interface CardContext {
  info: ClassInfo;
  subjects: Subject[];
  summary: SummaryMode;
  /** Row height in mm (see geometry.ts). */
  r: number;
  /** Width of one grid cell in mm; used to shrink over-long text instead of cutting it off. */
  cellW: number;
  theme: Theme;
}

const fmt = (n: number): string => n.toFixed(2);

/** Average (bold) glyph width as a fraction of the font size; deliberately conservative. */
const GLYPH_LATIN = 0.68;
const GLYPH_ARABIC = 0.58;
const MIN_SCALE = 0.62;

/** Scale (<= 1) that makes `text` fit `availMm` at `fontMm`; ellipsis is only the last resort. */
export function fitScale(text: string, availMm: number, fontMm: number): number {
  const glyph = /[\u0600-\u06FF]/.test(text) ? GLYPH_ARABIC : GLYPH_LATIN;
  const need = text.length * fontMm * glyph;
  return need <= availMm ? 1 : Math.max(MIN_SCALE, availMm / need);
}
const fsStyle = (fontMm: number, scale: number): string | null => (scale < 1 ? `font-size:${(fontMm * scale).toFixed(3)}mm` : null);

/** One uniform font scale for all subject names so rows stay visually consistent. */
function subjectScale(ctx: CardContext, availMm: number): number {
  const longest = ctx.subjects.reduce((m, s) => (s.name.length > m.length ? s.name : m), "");
  return fitScale(longest, availMm, ctx.r * 0.6);
}
const rowFont = (scale: number): string | null => (scale < 1 ? `font-size:calc(var(--r) * ${(0.6 * scale).toFixed(3)})` : null);

function summaryValues(st: Student, ctx: CardContext): { total: string; average: string } {
  const s = summarize(st, ctx.subjects);
  return s.count ? { total: fmt(s.total), average: fmt(s.average) } : { total: "-", average: "-" };
}

const gradeCell = (st: Student, s: Subject): string => displayGrade(st.grades[s.id]);

function star(color: string, size: number): HTMLElement {
  const el = document.createElement("span");
  el.className = "kd-star";
  el.style.width = el.style.height = `${size}mm`;
  el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="${color}" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  return el;
}

// ---------------------------------------------------------------- minimal
function minimalCard(st: Student, ctx: CardContext): HTMLElement {
  const sums = summaryValues(st, ctx);
  const inner = ctx.cellW - 6;
  const nameFs = fsStyle(ctx.r * 0.78, fitScale(st.name, inner, ctx.r * 0.78));
  const sFs = rowFont(subjectScale(ctx, inner - (ctx.r * 2.2 + 1.5)));
  return h(
    "div",
    { class: "rc rc-minimal", style: `--r:${ctx.r.toFixed(3)}mm` },
    h("div", { class: "mn-name", title: st.name, style: nameFs }, st.name),
    h("div", { class: "mn-class" }, ctx.info.className),
    h(
      "div",
      { class: "mn-rows" },
      ctx.subjects.map((s) => h("div", { class: "mn-row" }, h("span", { class: "s", title: s.name, style: sFs }, s.name), h("span", { class: "g" + (isNoGrade(st.grades[s.id]) ? " none" : "") }, gradeCell(st, s)))),
    ),
    ctx.summary !== "none"
      ? h(
          "div",
          { class: "mn-sum" },
          ctx.summary === "both" ? h("div", { class: "mn-row" }, h("span", { class: "s" }, t("card.total")), h("span", { class: "g" }, sums.total)) : null,
          h("div", { class: "mn-row" }, h("span", { class: "s" }, t("card.average")), h("span", { class: "g" }, sums.average)),
        )
      : null,
  );
}

// ------------------------------------------------------------ professional
function professionalCard(st: Student, ctx: CardContext): HTMLElement {
  const sums = summaryValues(st, ctx);
  const inner = ctx.cellW - 10.8;
  const unit = (inner - 0.4) / 3.7;
  const info = (label: string, value: string, widthMm: number) =>
    h("div", { class: "pr-cell" }, h("span", { class: "k" }, label), h("b", { title: value, style: fsStyle(3.3, fitScale(value, widthMm - 4, 3.3)) }, value));
  const sFs = rowFont(subjectScale(ctx, inner - 5 - ctx.r * 2.4));
  const schoolFs = fsStyle(4.4, fitScale(ctx.info.school, inner - 6, 4.4));
  return h(
    "div",
    { class: "rc rc-pro", style: `--r:${ctx.r.toFixed(3)}mm` },
    h("div", { class: "pr-head" }, h("div", { class: "pr-school", title: ctx.info.school, style: schoolFs }, ctx.info.school), h("div", { class: "pr-title" }, t("card.title"))),
    h("div", { class: "pr-info" }, info(t("card.student"), st.name, unit * 1.7), info(t("card.grade"), ctx.info.grade, unit), info(t("card.class"), ctx.info.className, unit)),
    h(
      "div",
      { class: "pr-table" },
      h("div", { class: "pr-th" }, h("span", null, t("card.subject")), h("span", null, t("card.score"))),
      ctx.subjects.map((s) => h("div", { class: "pr-row" }, h("span", { class: "s", title: s.name, style: sFs }, s.name), h("span", { class: "g" + (isNoGrade(st.grades[s.id]) ? " none" : "") }, gradeCell(st, s)))),
      ctx.summary === "both" ? h("div", { class: "pr-row pr-total" }, h("span", { class: "s" }, t("card.total")), h("span", { class: "g" }, sums.total)) : null,
      ctx.summary !== "none" ? h("div", { class: "pr-row pr-avg" }, h("span", { class: "s" }, t("card.average")), h("span", { class: "g" }, sums.average)) : null,
    ),
    h(
      "div",
      { class: "pr-foot" },
      h("div", { class: "pr-seal" }, t("card.seal")),
      h("div", { class: "pr-sign" }, h("div", { class: "pr-line" }, t("card.principal"))),
      h("div", { class: "pr-sign" }, h("div", { class: "pr-line" }, t("card.vice"))),
    ),
  );
}

// ---------------------------------------------------------------- playful
function playfulCard(st: Student, ctx: CardContext): HTMLElement {
  const sums = summaryValues(st, ctx);
  const k = ctx.theme.kids;
  const color = (i: number) => k[i % k.length];
  const inner = ctx.cellW - 10;
  const sFs = rowFont(subjectScale(ctx, inner - ctx.r * 2.8));
  const schoolFs = fsStyle(2.7, fitScale(ctx.info.school, inner - 7, 2.7));
  const nameFs = fsStyle(5.2, fitScale(st.name, inner - 9.2, 5.2));
  const chipW = (inner - 2) / 2 - 5;
  const gradeTxt = `${t("card.grade")}: ${ctx.info.grade}`;
  const classTxt = `${t("card.class")}: ${ctx.info.className}`;
  return h(
    "div",
    { class: "rc rc-kids", style: `--r:${ctx.r.toFixed(3)}mm` },
    h(
      "div",
      { class: "kd-head" },
      h("div", { class: "kd-school", title: ctx.info.school, style: schoolFs }, ctx.info.school),
      h("div", { class: "kd-title" }, star(ctx.theme.accent, 6), h("span", null, t("card.titleKids")), star(ctx.theme.accent, 6)),
    ),
    h("div", { class: "kd-name" }, h("span", { class: "k" }, t("card.student")), h("b", { title: st.name, style: nameFs }, st.name)),
    h(
      "div",
      { class: "kd-chips" },
      h("span", { class: "kd-chip", style: `background:${color(0)};${fsStyle(2.7, fitScale(gradeTxt, chipW, 2.7)) ?? ""}` }, gradeTxt),
      h("span", { class: "kd-chip", style: `background:${color(1)};${fsStyle(2.7, fitScale(classTxt, chipW, 2.7)) ?? ""}` }, classTxt),
    ),
    h(
      "div",
      { class: "kd-list" },
      ctx.subjects.map((s, i) =>
        h(
          "div",
          { class: "kd-row" },
          h("i", { class: "kd-dot", style: `background:${color(i)}` }),
          h("span", { class: "s", title: s.name, style: sFs }, s.name),
          h("span", { class: "kd-badge" + (isNoGrade(st.grades[s.id]) ? " none" : ""), style: isNoGrade(st.grades[s.id]) ? "" : `background:${color(i)}` }, gradeCell(st, s)),
        ),
      ),
    ),
    ctx.summary !== "none"
      ? h(
          "div",
          { class: "kd-sum" },
          ctx.summary === "both" ? h("div", { class: "kd-pill", style: `border-color:${color(2)}` }, h("span", null, t("card.total")), h("b", null, sums.total)) : null,
          h("div", { class: "kd-pill", style: `border-color:${color(0)}` }, h("span", null, t("card.average")), h("b", null, sums.average)),
        )
      : null,
    h("div", { class: "kd-sign" }, h("div", null, t("card.teacher")), h("div", null, t("card.parent"))),
  );
}

export function renderCard(template: TemplateId, st: Student, ctx: CardContext): HTMLElement {
  switch (template) {
    case "minimal":
      return minimalCard(st, ctx);
    case "professional":
      return professionalCard(st, ctx);
    case "playful":
      return playfulCard(st, ctx);
  }
}
