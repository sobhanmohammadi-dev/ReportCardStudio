import { h } from "../dom";
import { t } from "../i18n";
import { button, panel } from "../layout";
import { state } from "../state";

type InfoKey = "school" | "grade" | "className";

export function detailsView(go: (path: string) => void): HTMLElement {
  const fields: { key: InfoKey; label: string; ph: string }[] = [
    { key: "school", label: "field.school", ph: "ph.school" },
    { key: "grade", label: "field.grade", ph: "ph.grade" },
    { key: "className", label: "field.class", ph: "ph.class" },
  ];

  const inputs = new Map<InfoKey, { input: HTMLInputElement; error: HTMLElement }>();

  const next = () => {
    let firstBad: HTMLInputElement | null = null;
    for (const f of fields) {
      const { input, error } = inputs.get(f.key)!;
      const bad = !state.info[f.key].trim();
      input.classList.toggle("invalid", bad);
      error.textContent = bad ? t("err.required") : "";
      if (bad && !firstBad) firstBad = input;
    }
    if (firstBad) {
      firstBad.focus();
      return;
    }
    for (const f of fields) state.info[f.key] = state.info[f.key].trim();
    go(state.flow === "excel" ? "/excel/upload" : "/manual/subjects");
  };

  const body = h(
    "div",
    { class: "form-grid" },
    fields.map((f) => {
      const input = h("input", {
        type: "text",
        class: "input",
        id: `f-${f.key}`,
        value: state.info[f.key],
        placeholder: t(f.ph),
        autocomplete: "off",
        oninput: (e: Event) => {
          state.info[f.key] = (e.target as HTMLInputElement).value;
          if (state.info[f.key].trim()) {
            input.classList.remove("invalid");
            error.textContent = "";
          }
        },
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Enter") next();
        },
      }) as HTMLInputElement;
      const error = h("div", { class: "field-error" });
      inputs.set(f.key, { input, error });
      return h("div", { class: "field" }, h("label", { class: "label", for: `f-${f.key}` }, t(f.label)), input, error);
    }),
  );

  const el = panel({
    title: t("details.title"),
    subtitle: t("details.subtitle"),
    body,
    actions: [
      button(t("common.back"), "secondary", () => go("/"), { icon: "back" }),
      h("span", { class: "spacer" }),
      button(t("common.continue"), "primary", next, { iconAfter: "forward" }),
    ],
  });
  setTimeout(() => inputs.get("school")!.input.focus(), 0);
  return el;
}
