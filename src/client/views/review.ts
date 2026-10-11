import { displayGrade } from "../../shared/model";
import { h } from "../dom";
import { t } from "../i18n";
import { button, panel } from "../layout";
import { state } from "../state";

const PREVIEW_ROWS = 8;

export function reviewView(go: (path: string) => void): HTMLElement {
  const { subjects, students } = state;

  const stat = (label: string, value: number) =>
    h("div", { class: "stat" }, h("div", { class: "stat-value" }, String(value)), h("div", { class: "stat-label" }, label));

  const subjectTable = h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      { class: "data-table" },
      h("thead", null, h("tr", null, h("th", null, t("review.colSubject")), h("th", null, t("review.colType")), h("th", null, t("review.colDetails")))),
      h(
        "tbody",
        null,
        subjects.map((s) =>
          h(
            "tr",
            null,
            h("td", null, s.name),
            h("td", null, h("span", { class: `tag tag-${s.kind}` }, t(`format.${s.kind}`))),
            h("td", { class: "muted" }, s.kind === "categorical" ? t("review.options", { list: ["-", ...(s.options ?? [])].join(", ") }) : ""),
          ),
        ),
      ),
    ),
  );

  const preview = h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      { class: "data-table" },
      h("thead", null, h("tr", null, h("th", null, t("grades.num")), h("th", null, t("grades.name")), subjects.map((s) => h("th", null, s.name)))),
      h(
        "tbody",
        null,
        students.slice(0, PREVIEW_ROWS).map((st, i) =>
          h("tr", null, h("td", { class: "col-num" }, String(i + 1)), h("td", null, st.name), subjects.map((s) => h("td", { class: "center" }, displayGrade(st.grades[s.id])))),
        ),
      ),
    ),
  );

  return panel({
    title: t("review.title"),
    subtitle: t("review.subtitle"),
    wide: true,
    body: [
      h("div", { class: "stats" }, stat(t("review.students"), students.length), stat(t("review.subjects"), subjects.length)),
      h("h3", { class: "section-title" }, t("review.detected")),
      subjectTable,
      h("h3", { class: "section-title" }, t("review.preview")),
      preview,
      students.length > PREVIEW_ROWS ? h("p", { class: "muted" }, t("review.more", { n: students.length - PREVIEW_ROWS })) : null,
    ],
    actions: [
      button(t("common.back"), "secondary", () => go("/excel/upload"), { icon: "back" }),
      h("span", { class: "spacer" }),
      button(t("review.generate"), "primary", () => go("/report"), { iconAfter: "forward" }),
    ],
  });
}
