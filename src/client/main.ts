import { h } from "./dom";
import { applyLang } from "./i18n";
import { footer, stepper, STEPS, topbar } from "./layout";
import { Flow, infoComplete, resetData, state } from "./state";
import { detailsView } from "./views/details";
import { gradesView } from "./views/grades";
import { homeView } from "./views/home";
import { reportView } from "./views/report";
import { reviewView } from "./views/review";
import { subjectsView } from "./views/subjects";
import { buildSheets } from "./views/report";
import { fitRow, TEMPLATES } from "./report/geometry";
import { setLang } from "./i18n";
import { uploadView } from "./views/upload";

type Go = (path: string) => void;

interface Route {
  flow: Flow | "any" | null;
  guard: () => boolean;
  view: (go: Go) => HTMLElement;
}

const routes: Record<string, Route> = {
  "/": { flow: null, guard: () => true, view: homeView },
  "/manual/details": { flow: "manual", guard: () => true, view: detailsView },
  "/manual/subjects": { flow: "manual", guard: infoComplete, view: subjectsView },
  "/manual/grades": { flow: "manual", guard: () => infoComplete() && state.subjects.length > 0, view: gradesView },
  "/excel/details": { flow: "excel", guard: () => true, view: detailsView },
  "/excel/upload": { flow: "excel", guard: infoComplete, view: uploadView },
  "/excel/review": { flow: "excel", guard: () => infoComplete() && state.excelParsed, view: reviewView },
  "/report": { flow: "any", guard: () => infoComplete() && state.subjects.length > 0 && state.students.length > 0, view: reportView },
};

const go: Go = (path) => {
  if (currentPath() === path) render();
  else location.hash = `#${path}`;
};

function currentPath(): string {
  const p = location.hash.replace(/^#/, "");
  return p || "/";
}

function render(): void {
  let path = currentPath();
  let route = routes[path];
  if (!route || !route.guard()) {
    path = "/";
    route = routes["/"];
    if (location.hash !== "#/" && location.hash !== "") history.replaceState(null, "", "#/");
  }

  // Entering a flow resets data that belongs to the other flow (class details are kept).
  if (route.flow === "manual" || route.flow === "excel") {
    if (state.flow !== route.flow) {
      resetData();
      state.flow = route.flow;
    }
  } else if (path === "/") {
    state.flow = null;
  }

  applyLang();
  const root = document.getElementById("app")!;
  const flow = state.flow;
  const stepIndex = flow ? STEPS[flow].findIndex((s) => s.path === path) : -1;

  root.replaceChildren(
    topbar(render, () => go("/")),
    h("main", { class: "shell" }, flow && stepIndex >= 0 ? stepper(flow, stepIndex, go) : null, route.view(go)),
    footer(),
  );
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
render();

// Small hook used by the browser layout tests (test/layout.e2e.mjs); harmless in production.
(window as unknown as Record<string, unknown>).__rcs = { state, buildSheets, TEMPLATES, fitRow, setLang, render };
