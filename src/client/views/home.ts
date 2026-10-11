import { h } from "../dom";
import { icon } from "../icons";
import { t } from "../i18n";
import { button } from "../layout";

export function homeView(go: (path: string) => void): HTMLElement {
  const option = (ic: string, key: string, path: string) =>
    h(
      "div",
      {
        class: "option-card",
        tabindex: "0",
        role: "button",
        onclick: () => go(path),
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go(path);
          }
        },
      },
      h("div", { class: "option-icon" }, icon(ic, 28)),
      h("h2", null, t(`${key}.title`)),
      h("p", null, t(`${key}.desc`)),
      h(
        "ul",
        { class: "check-list" },
        h("li", null, icon("check", 16), h("span", null, t(`${key}.b1`))),
        h("li", null, icon("check", 16), h("span", null, t(`${key}.b2`))),
      ),
      button(t(`${key}.cta`), "primary", (e) => {
        e.stopPropagation();
        go(path);
      }, { iconAfter: "forward" }),
    );

  return h(
    "section",
    { class: "home" },
    h("div", { class: "home-head" }, h("h1", null, t("home.title")), h("p", null, t("home.subtitle"))),
    h("div", { class: "option-grid" }, option("excel", "home.excel", "/excel/details"), option("edit", "home.manual", "/manual/details")),
  );
}
