/*
  Shared chart theme for Recharts components.
  Colours are colour‑blind safe and map to the purple/white glass design system.
  Light/dark values are exposed through CSS variables – the UI sets
  `--kf-theme-light` or `--kf-theme-dark` on the root element.
*/

export const palette = {
  purple: '#7C3AED',   // primary
  violet: '#A78BFA',
  amber: '#F59E0B',
  blue: '#3B82F6',
  green: '#10B981',
  coral: '#EF4444',
  slate: '#94A3B8',
};

export const semantic = {
  income: palette.green,
  expense: palette.coral,
  profit: palette.purple,
  previous: '#9CA3AF', // gray for previous‑period line
};

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
};

export const grid = {
  stroke: 'var(--kf-chart-grid, rgba(0,0,0,0.05))',
  strokeWidth: 1,
  horizontal: true,
  vertical: false,
};

export const axis = {
  stroke: 'var(--kf-chart-axis, rgba(0,0,0,0.6))',
  tickFontSize: fontSize.sm,
  tickColor: 'var(--kf-chart-tick, rgba(0,0,0,0.5))',
};

export const animation = {
  duration: 700,
  easing: 'ease-out',
};

export const tooltip = {
  bg: 'var(--kf-tooltip-bg, rgba(255,255,255,0.95))',
  color: 'var(--kf-tooltip-fg, #111)',
  borderRadius: radius.sm,
  padding: '0.75rem 1rem',
  boxShadow: 'var(--kf-elevation-2)',
};
