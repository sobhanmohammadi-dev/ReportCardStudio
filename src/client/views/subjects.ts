import { NO_GRADE, parseNumber, Subject, SubjectErrors, validateSubjects } from "../../shared/model";
import { h } from "../dom";
import { icon } from "../icons";
import { t } from "../i18n";
import { alertBox, button, panel } from "../layout";
import { newSubject, state } from "../state";

export function subjectsView(go: (path: string) => void): HTMLElement {
  if (state.subjects.length === 0) state.subjects.push(newSubject());

  let showErrors = false;
  const list = h("div", { class: "subject-list" });
  const banner = h("div", { class: "banner-slot" });

  const errMessage = (field: keyof SubjectErrors, code: string): string => {
    if (field === "name") return code === "duplicate" ? t("err.name.duplicate") : t("err.required");
    if (field === "step") return code === "tooLarge" ? t("err.num.stepTooLarge") : t("err.num.stepInvalid");
    if (field === "max" && code === "minMax") return t("err.num.minMax");
    if (field === "options") return t("err.opt.required");
    return t("err.num.invalid");
  };

  /** Writes validation state into the existing cards without rebuilding them (keeps focus). */
  function paint(): void {
    const errs = validateSubjects(state.subjects);
    list.querySelectorAll<HTMLElement>(".subject-card").forEach((card) => {
      const e: SubjectErrors = errs[card.dataset.id!] ?? {};
      card.querySelectorAll<HTMLElement>("[data-field]").forEach((control) => {
        control.classList.toggle("invalid", showErrors && !!e[control.dataset.field as keyof SubjectErrors]);
      });
      card.querySelectorAll<HTMLElement>("[data-err]").forEach((slot) => {
        const f = slot.dataset.err as keyof SubjectErrors;
        const code = e[f];
        slot.textContent = showErrors && code ? errMessage(f, code) : "";
      });
    });
  }
  const touch = () => {
    if (showErrors) paint();
  };

  function renderList(): void {
    list.replaceChildren(...state.subjects.map(makeCard));
    touch();
  }

  function makeCard(s: Subject): HTMLElement {
    let el: HTMLElement;

    /** Rebuilds just this card in place (format switch, option add/remove). */
    const rebuild = (focusOption = false, optMsg = ""): void => {
      const fresh = build(focusOption, optMsg);
      el.replaceWith(fresh);
      el = fresh;
      touch();
      if (focusOption) (el.querySelector(".chip-input") as HTMLInputElement | null)?.focus();
    };

    const numberField = (field: "min" | "max" | "step", label: string): HTMLElement =>
      h(
        "div",
        { class: "field" },
        h("label", { class: "label" }, label),
        h("input", {
          type: "text",
          inputmode: "decimal",
          class: "input",
          "data-field": field,
          value: s[field] === undefined ? "" : String(s[field]),
          autocomplete: "off",
          oninput: (e: Event) => {
            const n = parseNumber((e.target as HTMLInputElement).value);
            s[field] = n === null ? undefined : n;
            touch();
          },
        }),
        h("div", { class: "field-error", "data-err": field }),
      );

    const optionsEditor = (optMsg: string): HTMLElement => {
      const chips = h("div", { class: "chips", "data-field": "options" });
      chips.appendChild(h("span", { class: "chip chip-fixed", title: t("cat.nograde") }, NO_GRADE));
      for (const opt of s.options ?? []) {
        chips.appendChild(
          h(
            "span",
            { class: "chip" },
            h("span", null, opt),
            h(
              "button",
              {
                type: "button",
                class: "chip-x",
                "aria-label": `${t("common.remove")}: ${opt}`,
                onclick: () => {
                  s.options = (s.options ?? []).filter((o) => o !== opt);
                  rebuild();
                },
              },
              icon("x", 12),
            ),
          ),
        );
      }

      const input = h("input", {
        type: "text",
        class: "input chip-input",
        placeholder: t("cat.ph"),
        autocomplete: "off",
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        },
      }) as HTMLInputElement;

      const add = () => {
        const v = input.value.trim();
        if (!v) return;
        if (v === NO_GRADE) return rebuild(true, t("err.opt.reserved"));
        if ((s.options ?? []).includes(v)) return rebuild(true, t("err.opt.duplicate"));
        s.options = [...(s.options ?? []), v];
        rebuild(true);
      };

      return h(
        "div",
        { class: "field" },
        h("label", { class: "label" }, t("cat.options")),
        chips,
        h("div", { class: "chip-add" }, input, button(t("cat.add"), "secondary", add, { icon: "plus", small: true })),
        h("div", { class: "field-error" }, optMsg),
        h("div", { class: "field-error", "data-err": "options" }),
        h("div", { class: "hint" }, t("cat.nograde")),
      );
    };

    const segBtn = (kind: Subject["kind"], label: string) =>
      h(
        "button",
        {
          type: "button",
          class: "seg-btn" + (s.kind === kind ? " active" : ""),
          "aria-pressed": String(s.kind === kind),
          onclick: () => {
            if (s.kind === kind) return;
            s.kind = kind;
            if (kind === "numeric") {
              s.min ??= 0;
              s.max ??= 20;
              s.step ??= 0.25;
            } else {
              s.options ??= [];
            }
            // grades entered under the old format no longer apply
            for (const st of state.students) delete st.grades[s.id];
            rebuild();
          },
        },
        label,
      );

    const move = (delta: number) => {
      const i = state.subjects.indexOf(s);
      const j = i + delta;
      if (j < 0 || j >= state.subjects.length) return;
      [state.subjects[i], state.subjects[j]] = [state.subjects[j], state.subjects[i]];
      renderList();
    };

    function build(_focusOption = false, optMsg = ""): HTMLElement {
      const index = state.subjects.indexOf(s);
      const last = state.subjects.length - 1;
      return h(
        "div",
        { class: "subject-card", "data-id": s.id },
        h(
          "div",
          { class: "subject-head" },
          h("span", { class: "badge" }, String(index + 1)),
          h(
            "div",
            { class: "field grow" },
            h("label", { class: "label" }, t("subject.name")),
            h("input", {
              type: "text",
              class: "input",
              "data-field": "name",
              value: s.name,
              placeholder: t("ph.subject"),
              autocomplete: "off",
              oninput: (e: Event) => {
                s.name = (e.target as HTMLInputElement).value;
                touch();
              },
            }),
            h("div", { class: "field-error", "data-err": "name" }),
          ),
          h(
            "div",
            { class: "row-actions" },
            button("", "ghost", () => move(-1), { icon: "up", small: true, title: t("subject.up"), disabled: index === 0 }),
            button("", "ghost", () => move(1), { icon: "down", small: true, title: t("subject.down"), disabled: index === last }),
            button(
              "",
              "danger",
              () => {
                state.subjects = state.subjects.filter((x) => x !== s);
                for (const st of state.students) delete st.grades[s.id];
                renderList();
              },
              { icon: "trash", small: true, title: t("subject.remove") },
            ),
          ),
        ),
        h(
          "div",
          { class: "subject-body" },
          h(
            "div",
            { class: "field" },
            h("label", { class: "label" }, t("subject.format")),
            h("div", { class: "segmented" }, segBtn("numeric", t("format.numeric")), segBtn("categorical", t("format.categorical"))),
          ),
          s.kind === "numeric"
            ? h("div", { class: "num-grid" }, numberField("min", t("num.min")), numberField("max", t("num.max")), numberField("step", t("num.step")))
            : optionsEditor(optMsg),
        ),
      );
    }

    el = build();
    return el;
  }

  renderList();

  const onNext = () => {
    banner.replaceChildren();
    if (state.subjects.length === 0) {
      banner.appendChild(alertBox("error", t("subjects.needOne")));
      return;
    }
    showErrors = true;
    const errs = validateSubjects(state.subjects);
    paint();
    if (Object.keys(errs).length) {
      banner.appendChild(alertBox("error", t("subjects.fixErrors")));
      const bad = list.querySelector(".invalid") as HTMLElement | null;
      bad?.scrollIntoView({ block: "center", behavior: "smooth" });
      bad?.focus();
      return;
    }
    for (const s of state.subjects) s.name = s.name.trim();
    go("/manual/grades");
  };

  const addBtn = button(
    t("subjects.add"),
    "secondary",
    () => {
      state.subjects.push(newSubject());
      renderList();
      banner.replaceChildren();
      const card = list.lastElementChild as HTMLElement;
      card.scrollIntoView({ block: "center", behavior: "smooth" });
      (card.querySelector('[data-field="name"]') as HTMLInputElement | null)?.focus();
    },
    { icon: "plus" },
  );

  return panel({
    title: t("subjects.title"),
    subtitle: t("subjects.subtitle"),
    body: [banner, list, h("div", { class: "add-row" }, addBtn)],
    actions: [
      button(t("common.back"), "secondary", () => go("/manual/details"), { icon: "back" }),
      h("span", { class: "spacer" }),
      button(t("common.continue"), "primary", onNext, { iconAfter: "forward" }),
    ],
  });
}
