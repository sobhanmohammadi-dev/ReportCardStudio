import { Student, Subject } from "../../shared/model";
import { h } from "../dom";
import { icon } from "../icons";
import { getLang, t } from "../i18n";
import { alertBox, button, panel } from "../layout";
import { resetData, state } from "../state";

const MAX_BYTES = 10 * 1024 * 1024;

const formatSize = (n: number): string => (n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);

function exampleTable(): HTMLElement {
  const cell = (txt: string, cls = "") => h("td", { class: cls }, txt);
  return h(
    "div",
    { class: "table-wrap example" },
    h(
      "table",
      { class: "mini-table", dir: "ltr" },
      h(
        "thead",
        null,
        h("tr", null, h("th", { class: "idx" }, ""), h("th", { class: "idx" }, "A"), h("th", { class: "idx" }, "B"), h("th", { class: "idx" }, "C"), h("th", { class: "idx" }, "D")),
      ),
      h(
        "tbody",
        null,
        h("tr", null, h("th", { class: "idx" }, "1"), cell("", "blank"), cell(t("ex.s1"), "hdr"), cell(t("ex.s2"), "hdr"), cell(t("ex.s3"), "hdr")),
        h("tr", null, h("th", { class: "idx" }, "2"), cell(t("ex.n1"), "name"), cell("18"), cell("17.5"), cell(t("ex.c1"))),
        h("tr", null, h("th", { class: "idx" }, "3"), cell(t("ex.n2"), "name"), cell("16"), cell("-"), cell(t("ex.c2"))),
      ),
    ),
  );
}

export function uploadView(go: (path: string) => void): HTMLElement {
  const fileInput = h("input", { type: "file", accept: ".xlsx", class: "visually-hidden", id: "excelFile" }) as HTMLInputElement;
  const banner = h("div", { class: "banner-slot" });
  const dropzone = h("div", { class: "dropzone", tabindex: "0", role: "button" });
  const analyzeBtn = button(t("upload.analyze"), "primary", () => analyze(), { iconAfter: "forward", disabled: !state.excelFile });

  const showError = (msg: string) => banner.replaceChildren(alertBox("error", msg));

  function renderDrop(): void {
    const f = state.excelFile;
    dropzone.classList.toggle("has-file", !!f);
    dropzone.replaceChildren(
      f
        ? h(
            "div",
            { class: "file-row" },
            icon("excel", 28),
            h("div", { class: "file-meta" }, h("strong", null, f.name), h("span", { class: "muted" }, formatSize(f.size))),
            button(
              t("common.remove"),
              "ghost",
              (e) => {
                e.stopPropagation();
                state.excelFile = null;
                fileInput.value = "";
                renderDrop();
              },
              { icon: "x", small: true },
            ),
          )
        : h("div", { class: "drop-empty" }, icon("upload", 30), h("strong", null, t("upload.drop")), h("span", { class: "muted" }, t("upload.hint"))),
    );
    (analyzeBtn as HTMLButtonElement).disabled = !f;
  }

  function pick(file: File | undefined): void {
    banner.replaceChildren();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) return showError(t("err.bad_type"));
    if (file.size > MAX_BYTES) return showError(t("err.too_large"));
    state.excelFile = file;
    state.excelParsed = false;
    renderDrop();
  }

  async function analyze(): Promise<void> {
    const file = state.excelFile;
    if (!file) return showError(t("err.no_file"));
    banner.replaceChildren();
    (analyzeBtn as HTMLButtonElement).disabled = true;
    analyzeBtn.classList.add("loading");
    analyzeBtn.querySelector("span:not(.icon)")!.textContent = t("upload.analyzing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/excel/parse", { method: "POST", body: fd });
      const json = (await res.json()) as
        | { ok: true; subjects: Subject[]; students: Student[] }
        | { ok: false; code: string; detail: string | null };
      if (!json.ok) {
        const key = `err.${json.code}`;
        const msg = t(key, { name: json.detail ?? "" });
        showError(msg === key ? t("err.unknown") : msg);
        return;
      }
      state.subjects = json.subjects;
      state.students = json.students;
      state.excelParsed = true;
      go("/excel/review");
    } catch {
      showError(t("err.network"));
    } finally {
      analyzeBtn.classList.remove("loading");
      analyzeBtn.querySelector("span:not(.icon)")!.textContent = t("upload.analyze");
      (analyzeBtn as HTMLButtonElement).disabled = !state.excelFile;
    }
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    pick(e.dataTransfer?.files?.[0]);
  });
  fileInput.addEventListener("change", () => pick(fileInput.files?.[0]));

  renderDrop();

  const body = h(
    "div",
    { class: "upload-layout" },
    h("div", null, banner, dropzone, fileInput, h("a", { class: "link-action", href: `/sample.xlsx?lang=${getLang()}`, download: "" }, icon("download", 16), t("upload.sample"))),
    h(
      "aside",
      { class: "format-box" },
      h("h3", null, t("upload.format")),
      exampleTable(),
      h("ul", { class: "rules" }, [1, 2, 3, 4, 5].map((n) => h("li", null, t(`upload.rule${n}`)))),
    ),
  );

  return panel({
    title: t("upload.title"),
    subtitle: t("upload.subtitle"),
    wide: true,
    body,
    actions: [
      button(
        t("common.back"),
        "secondary",
        () => {
          resetData();
          go("/excel/details");
        },
        { icon: "back" },
      ),
      h("span", { class: "spacer" }),
      analyzeBtn,
    ],
  });
}
