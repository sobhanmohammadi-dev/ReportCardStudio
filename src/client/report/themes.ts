export interface Theme {
  id: string;
  primary: string;
  dark: string;
  soft: string;
  accent: string;
  /** Five cheerful colours used by the playful template (cycled per subject). */
  kids: string[];
}

export const THEMES: Theme[] = [
  { id: "ocean", primary: "#1d4ed8", dark: "#1e3a8a", soft: "#e8f0ff", accent: "#38bdf8", kids: ["#2563eb", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6"] },
  { id: "emerald", primary: "#059669", dark: "#065f46", soft: "#e6f7ef", accent: "#34d399", kids: ["#059669", "#84cc16", "#f59e0b", "#0ea5e9", "#ec4899"] },
  { id: "sunset", primary: "#ea580c", dark: "#9a3412", soft: "#fff1e6", accent: "#fbbf24", kids: ["#ea580c", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6"] },
  { id: "royal", primary: "#7c3aed", dark: "#4c1d95", soft: "#f1eaff", accent: "#c084fc", kids: ["#7c3aed", "#ec4899", "#3b82f6", "#f59e0b", "#10b981"] },
  { id: "rose", primary: "#e11d48", dark: "#9f1239", soft: "#ffe9ee", accent: "#fb7185", kids: ["#e11d48", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16"] },
  { id: "graphite", primary: "#374151", dark: "#111827", soft: "#f1f3f5", accent: "#9ca3af", kids: ["#374151", "#6b7280", "#9ca3af", "#4b5563", "#1f2937"] },
];

export const themeById = (id: string): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** CSS custom properties that parameterise every template. */
export function themeVars(t: Theme): Record<string, string> {
  const v: Record<string, string> = { "--primary": t.primary, "--dark": t.dark, "--soft": t.soft, "--accent": t.accent };
  t.kids.forEach((c, i) => (v[`--k${i + 1}`] = c));
  return v;
}
