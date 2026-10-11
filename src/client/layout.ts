import { Child, h } from "./dom";
import { icon, logo } from "./icons";
import { getLang, Lang, setLang, t } from "./i18n";
import { Flow } from "./state";

export const STEPS: Record<Flow, { key: string; path: string }[]> = {
  manual: [
    { key: "step.details", path: "/manual/details" },
    { key: "step.subjects", path: "/manual/subjects" },
    { key: "step.grades", path: "/manual/grades" },
    { key: "step.report", path: "/report" },
  ],
  excel: [
    { key: "step.details", path: "/excel/details" },
    { key: "step.upload", path: "/excel/upload" },
    { key: "step.review", path: "/excel/review" },
    { key: "step.report", path: "/report" },
  ],
};

export function topbar(onLangChange: () => void, goHome: () => void): HTMLElement {
  const langBtn = (l: Lang, label: string) =>
    h(
      "button",
      {
        type: "button",
        class: "lang-btn" + (getLang() === l ? " active" : ""),
        lang: l,
        "aria-pressed": String(getLang() === l),
        onclick: () => {
          if (getLang() !== l) {
            setLang(l);
            onLangChange();
          }
        },
      },
      label,
    );

  return h(
    "header",
    { class: "topbar no-print" },
    h(
      "div",
      { class: "topbar-inner" },
      h(
        "a",
        {
          class: "brand",
          href: "#/",
          onclick: (e: Event) => {
            e.preventDefault();
            goHome();
          },
        },
        h("span", { class: "brand-mark" }, logo(38)),
        h("span", { class: "brand-text" }, h("strong", null, t("app.name")), h("small", null, t("app.tagline"))),
      ),
      h("div", { class: "lang-switch", role: "group", "aria-label": "Language" }, langBtn("en", "English"), langBtn("fa", "فارسی")),
    ),
  );
}

export function stepper(flow: Flow, current: number, go: (path: string) => void): HTMLElement {
  const steps = STEPS[flow];
  return h(
    "nav",
    { class: "stepper no-print", "aria-label": "Progress" },
    h(
      "ol",
      null,
      steps.map((s, i) => {
        const done = i < current;
        const cls = "step" + (done ? " done" : "") + (i === current ? " current" : "");
        const body = [
          h("span", { class: "step-dot" }, done ? icon("check", 14) : String(i + 1)),
          h("span", { class: "step-label" }, t(s.key)),
        ];
        return h(
          "li",
          { class: cls, "aria-current": i === current ? "step" : null },
          done ? h("button", { type: "button", class: "step-btn", onclick: () => go(s.path) }, body) : h("span", { class: "step-btn" }, body),
        );
      }),
    ),
  );
}

export function footer(): HTMLElement {
  return h("footer", { class: "footer no-print" }, `${t("app.name")} \u00B7 v${__APP_VERSION__}`);
}

export interface PanelOpts {
  title: string;
  subtitle?: string;
  body: Child;
  actions?: HTMLElement[];
  wide?: boolean;
}

export function panel(o: PanelOpts): HTMLElement {
  return h(
    "section",
    { class: "panel" + (o.wide ? " panel-wide" : "") },
    h("div", { class: "panel-head" }, h("h1", null, o.title), o.subtitle ? h("p", null, o.subtitle) : null),
    h("div", { class: "panel-body" }, o.body),
    o.actions ? h("div", { class: "panel-foot" }, o.actions) : null,
  );
}

export function button(
  label: string,
  kind: "primary" | "secondary" | "ghost" | "danger",
  onclick: (e: Event) => void,
  opts: { icon?: string; iconAfter?: string; small?: boolean; disabled?: boolean; title?: string; id?: string } = {},
): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: `btn btn-${kind}` + (opts.small ? " btn-sm" : ""),
      onclick,
      disabled: opts.disabled,
      title: opts.title,
      id: opts.id,
    },
    opts.icon ? icon(opts.icon, opts.small ? 16 : 18) : null,
    label ? h("span", null, label) : null,
    opts.iconAfter ? icon(opts.iconAfter, opts.small ? 16 : 18) : null,
  );
}

export function alertBox(kind: "error" | "info", text: string): HTMLElement {
  return h("div", { class: `alert alert-${kind}`, role: "alert" }, icon("alert", 18), h("span", null, text));
}
