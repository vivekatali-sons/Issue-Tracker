/**
 * Centralized color palette for the DMS app.
 *
 * Light mode  = corporate, muted, professional
 * Dark mode   = vibrant, neon-ish for glassmorphism
 *
 * Each status/category has `light` (for light theme) and `dark` (for dark theme) hex values.
 */

export const BAR_CHART_COLORS = {
  new:        { light: "#3574d4", dark: "#60a5fa" }, // blue
  inProgress: { light: "#7c4fd4", dark: "#a78bfa" }, // violet
  resolved:   { light: "#0e9f72", dark: "#14b8a6" }, // teal/green
} as const;

export const PROCESS_CHART_COLORS = {
  light: ["#0f2b5b", "#b8860b", "#2563eb", "#0e9f72", "#be185d", "#c2410c"],
  dark:  ["#6366f1", "#f59e0b", "#38bdf8", "#14b8a6", "#f472b6", "#fb923c"],
} as const;

/** Status donut chart — maps the API chartColor hex to a dark-mode override */
export const STATUS_CHART_DARK_OVERRIDES: Record<string, string> = {
  "#3b82f6": "#60a5fa", // Open — brighter blue
  "#22c55e": "#4ade80", // Resolved — brighter green
  "#ef4444": "#f87171", // Reopened — brighter red
  "#f59e0b": "#fbbf24", // In Progress — brighter amber
  "#8b5cf6": "#a78bfa", // Testing — brighter violet
  "#6b7280": "#9ca3af", // Closed — brighter gray
};
