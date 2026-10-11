const PATHS: Record<string, string> = {
  excel: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  forward: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  printer: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  restart: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
};

const DIRECTIONAL = new Set(["forward", "back"]);

export function icon(name: keyof typeof PATHS | string, size = 18): HTMLElement {
  const span = document.createElement("span");
  span.className = "icon" + (DIRECTIONAL.has(name) ? " icon-dir" : "");
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? ""}</svg>`;
  return span;
}

const LOGO_INNER = `<defs>
    <linearGradient id="rcs-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#rcs-bg)"/>
  <path d="M18 10h20l11 11v28a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="#ffffff"/>
  <path d="M38 10v7a4 4 0 0 0 4 4h7z" fill="#bfdbfe"/>
  <rect x="20" y="25" width="13" height="3.2" rx="1.6" fill="#93b4f5"/>
  <rect x="37" y="25" width="7" height="3.2" rx="1.6" fill="#1d4ed8"/>
  <rect x="20" y="32" width="13" height="3.2" rx="1.6" fill="#93b4f5"/>
  <rect x="37" y="32" width="7" height="3.2" rx="1.6" fill="#1d4ed8"/>
  <rect x="20" y="39" width="13" height="3.2" rx="1.6" fill="#93b4f5"/>
  <rect x="37" y="39" width="7" height="3.2" rx="1.6" fill="#1d4ed8"/>
  <circle cx="45" cy="46" r="10.5" fill="#fbbf24" stroke="#ffffff" stroke-width="2.5"/>
  <path d="M40.2 46.2l3.6 3.7 6-7.6" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

/** The project logo (same artwork as assets/logo-mark.svg). */
export function logo(size = 36): HTMLElement {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${LOGO_INNER}</svg>`;
  return span;
}
