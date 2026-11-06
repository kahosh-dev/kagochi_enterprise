/**
 * Design token constants for use in TSX where CSS variables cannot be applied
 * directly (e.g. SVG presentation attributes, JS-computed color values).
 *
 * Keep these values in sync with tokens.css.
 */

export const COLORS = {
  forest:     "#1a3d2b",
  action:     "#2d6a4f",
  lime:       "#52b788",

  green300:   "#86efac",
  green400:   "#4ade80",
  green600:   "#16a34a",
  green700:   "#2e7d32",
  teal:       "#0f766e",
  limeDark:   "#65a30d",

  red:        "#dc2626",
  amber:      "#d97706",
  blue:       "#2563eb",
  plum:       "#7c3aed",
  slate:      "#cbd5e1",

  muted:      "#6b7280",
  muted2:     "#9ca3af",
  white:      "#ffffff",

  chartGrid:  "#e6ece4",
  chartTrack: "#eef2ec",
} as const;

/** Default chart palette — matches design.css donut/bar segment order */
export const PALETTE: readonly string[] = [
  COLORS.green700,
  COLORS.green400,
  COLORS.teal,
  COLORS.amber,
  COLORS.plum,
  COLORS.red,
  COLORS.blue,
  COLORS.limeDark,
];
