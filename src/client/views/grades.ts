import { GradeError, isNoGrade, normalizeNumberText, NO_GRADE, parseNumber, Student, Subject, validateGrade } from "../../shared/model";
import { h } from "../dom";
import { t } from "../i18n";
import { alertBox, button, panel } from "../layout";
import { state } from "../state";

const num = (n: number | undefined): string => (n === undefined ? "" : String(n));

function gradeErrorText(s: Subject, e: GradeError): string {
  return t(`err.grade.${e}`, { min: num(s.min), max: num(s.max), step: num(s.step) });
}

function isBlankStudent(st: Student): boolean {
  return !st.name.trim() && Object.values(st.grades).every(isNoGrade);
}

export function gradesView(go: (path: string) => void): HTMLElement {
  const subjects = state.subjects;
  if (state.students.length === 0) state.students.push({ name: "", grades: {} });

  const tbody = h("tbody");
  const banner = h("div", { class: "banner-slot" });
  const counter = h("span", { class: "muted" });

  const updateCounter = () => {
    counter.textContent = t("grades.count", { n: state.students.filter((s) => !isBlankStudent(s)).length });
  };

  function markCell(control: HTMLElement, message: string): void {
    control.classList.toggle("invalid", !!message);
    control.title = message;
  }

  function checkGradeControl(control: HTMLInputElement | HTMLSelectElement, s: Subject, value: string): boolean {
    const e = validateGrade(s, value);
    markCell(control, e ? gradeErrorText(s, e) : "");
    return !e;
  }

  function buildRow(st: Student, index: number): HTMLElement {
    const tr = h("tr");
    tr.appendChild(h("td", { class: "col-num" }, String(index + 1)));

    const nameInput = h("input", {
      type: "text",
      class: "cell-input cell-name",
      "data-kind": "name",
      value: st.name,
      placeholder: t("grades.ph.name"),
      autocomplete: "off",
      oninput: (e: Event) => {
        st.name = (e.target as HTMLInputElement).value;
        if (st.name.trim()) markCell(nameInput, "");
        updateCounter();
      },
    }) as HTMLInputElement;
    tr.appendChild(h("td", { class: "col-name" }, nameInput));

    for (const s of subjects) {
      let control: HTMLInputElement | HTMLSelectElement;
      if (s.kind === "numeric") {
        const input = h("input", {
          type: "text",
          inputmode: "decimal",
          class: "cell-input",
          "data-sid": s.id,
          value: st.grades[s.id] ?? "",
          autocomplete: "off",
          oninput: (e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            const n = parseNumber(raw);
            const stored = isNoGrade(raw) ? "" : n !== null ? normalizeNumberText(raw) : raw.trim();
            if (stored) st.grades[s.id] = stored;
            else delete st.grades[s.id];
            if (input.classList.contains("invalid")) checkGradeControl(input, s, stored);
            updateCounter();
          },
          onblur: (e: Event) => checkGradeControl(e.target as HTMLInputElement, s, st.grades[s.id] ?? ""),
        }) as HTMLInputElement;
        control = input;
      } else {
        const current = st.grades[s.id] ?? "";
        const opts = [NO_GRADE, ...(s.options ?? [])];
        if (!isNoGrade(current) && !opts.includes(current)) opts.push(current); // stale value, flagged on validation
        const select = h(
          "select",
          {
            class: "cell-input cell-select",
            "data-sid": s.id,
            onchange: (e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v === NO_GRADE) delete st.grades[s.id];
              else st.grades[s.id] = v;
              checkGradeControl(select, s, v === NO_GRADE ? "" : v);
              updateCounter();
            },
          },
          opts.map((o) => h("option", { value: o, selected: (isNoGrade(current) ? NO_GRADE : current) === o }, o)),
        ) as HTMLSelectElement;
        control = select;
      }
      tr.appendChild(h("td", null, control));
    }

    tr.appendChild(
      h(
        "td",
        { class: "col-actions" },
        button(
          "",
          "danger",
          () => {
            state.students = state.students.filter((x) => x !== st);
            if (state.students.length === 0) state.students.push({ name: "", grades: {} });
            renderRows();
          },
          { icon: "trash", small: true, title: t("grades.remove") },
        ),
      ),
    );
    return tr;
  }

  function renderRows(): void {
    tbody.replaceChildren(...state.students.map(buildRow));
    updateCounter();
  }

  function addStudent(): void {
    const st: Student = { name: "", grades: {} };
    state.students.push(st);
    const row = buildRow(st, state.students.length - 1);
    tbody.appendChild(row);
    updateCounter();
    const input = row.querySelector(".cell-name") as HTMLInputElement;
    input.scrollIntoView({ block: "nearest" });
    input.focus();
  }

  // Enter moves to the next cell; after the last cell of the last row a new student row is added.
  const table = h(
    "table",
    {
      class: "grid-table",
      onkeydown: (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (e.key !== "Enter" || target.tagName !== "INPUT") return;
        e.preventDefault();
        const controls = Array.from(table.querySelectorAll<HTMLElement>("tbody input, tbody select"));
        const i = controls.indexOf(target);
        if (i >= 0 && i < controls.length - 1) {
          controls[i + 1].focus();
          (controls[i + 1] as HTMLInputElement).select?.();
        } else addStudent();
      },
    },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", { class: "col-num" }, t("grades.num")),
        h("th", { class: "col-name" }, t("grades.name")),
        subjects.map((s) =>
          h(
            "th",
            null,
            h("div", { class: "th-name" }, s.name),
            h(
              "div",
              { class: "th-hint" },
              s.kind === "numeric" ? t("grades.range", { min: num(s.min), max: num(s.max), step: num(s.step) }) : `${NO_GRADE} / ${(s.options ?? []).length}`,
            ),
          ),
        ),
        h("th", { class: "col-actions" }),
      ),
    ),
    tbody,
  );

  renderRows();

  const onGenerate = () => {
    banner.replaceChildren();
    let invalid = 0;
    let first: HTMLElement | null = null;
    const flag = (el: HTMLElement | null) => {
      invalid++;
      if (el && !first) first = el;
    };

    state.students.forEach((st, i) => {
      const row = tbody.children[i] as HTMLElement;
      if (isBlankStudent(st)) return;
      const nameEl = row.querySelector(".cell-name") as HTMLInputElement;
      if (!st.name.trim()) {
        markCell(nameEl, t("grades.nameRequired"));
        flag(nameEl);
      } else markCell(nameEl, "");
      for (const s of subjects) {
        const control = row.querySelector(`[data-sid="${s.id}"]`) as HTMLInputElement | HTMLSelectElement;
        if (!checkGradeControl(control, s, st.grades[s.id] ?? "")) flag(control);
      }
    });

    const real = state.students.filter((s) => !isBlankStudent(s));
    if (real.length === 0) {
      banner.appendChild(alertBox("error", t("grades.noStudents")));
      return;
    }
    if (invalid > 0) {
      banner.appendChild(alertBox("error", t("grades.invalid", { n: invalid })));
      const el = first as HTMLElement | null;
      el?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      el?.focus();
      return;
    }
    state.students = real.map((s) => ({ name: s.name.trim(), grades: { ...s.grades } }));
    go("/report");
  };

  return panel({
    title: t("grades.title"),
    subtitle: t("grades.subtitle"),
    wide: true,
    body: [
      banner,
      h("div", { class: "table-toolbar" }, counter, button(t("grades.add"), "secondary", addStudent, { icon: "plus", small: true })),
      h("div", { class: "table-wrap" }, table),
    ],
    actions: [
      button(t("common.back"), "secondary", () => go("/manual/subjects"), { icon: "back" }),
      h("span", { class: "spacer" }),
      button(t("grades.generate"), "primary", onGenerate, { iconAfter: "forward" }),
    ],
  });
}
