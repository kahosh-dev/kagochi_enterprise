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

  // Landscape / illustration colors (FarmBackground)
  skyGlow:      "#f7e8b8",
  farHillLight: "#779b69",
  farHillDark:  "#4d7950",
  nearHillTop:  "#426c42",
  nearHillBase: "#183f2b",
  sunHaloLight: "#fff4c4",
  sunHaloDark:  "#f8d68a",
  fieldLight:   "#6c8d4c",
  fieldDark:    "#244c31",
  cloudFill:    "#fff9e8",
  cropRow:      "#a4bd70",
  birdStroke:   "#263e32",
  houseFill:    "#203f2c",
  houseRoof:    "#493f2c",
  houseDoor:    "#e7c77c",
  houseWindow:  "#f4d99a",
  livestockFill:"#1d3b2a",
  horizonDark:  "#173c29",
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
