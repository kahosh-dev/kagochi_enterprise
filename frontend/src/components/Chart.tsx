import type { ReactNode } from "react";
import { COLORS, PALETTE } from "../styles/tokens";

export interface ChartPoint {
  label: string;
  value: number;
  tone?: "green" | "red" | "amber" | "slate";
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/* =====================================================
   LINE / AREA CHART
   ===================================================== */

export function LineChart({
  data,
  height = 220,
  color = COLORS.green700,
  valueSuffix = "",
  emptyLabel = "No data for this period.",
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  valueSuffix?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <div className="kf-chart-empty">{emptyLabel}</div>;
  }

  const width = 720;
  const pad = { top: 18, right: 14, bottom: 34, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxValue = niceMax(Math.max(...data.map((point) => point.value), 0));
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const gradientId = `kf-line-${color.replace("#", "")}`;

  const points = data.map((point, index) => {
    const x = pad.left + (data.length > 1 ? index * step : innerW / 2);
    const y = pad.top + innerH - (point.value / maxValue) * innerH;
    return { ...point, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`;
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="kf-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend line chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = pad.top + innerH * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={COLORS.chartGrid} strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="kf-chart-axis">
                {Math.round(maxValue * fraction).toLocaleString()}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="3.2" fill={COLORS.white} stroke={color} strokeWidth="2">
              <title>{`${point.label}: ${point.value.toLocaleString()}${valueSuffix}`}</title>
            </circle>
            {index % labelEvery === 0 && (
              <text x={point.x} y={height - 10} textAnchor="middle" className="kf-chart-axis">
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* =====================================================
   BAR CHART
   ===================================================== */

export function BarChart({
  data,
  height = 220,
  valueSuffix = "",
  emptyLabel = "No data for this period.",
}: {
  data: ChartPoint[];
  height?: number;
  valueSuffix?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <div className="kf-chart-empty">{emptyLabel}</div>;
  }

  const width = 720;
  const pad = { top: 18, right: 14, bottom: 38, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxValue = niceMax(Math.max(...data.map((point) => point.value), 0));
  const slot = innerW / data.length;
  const barWidth = Math.max(6, Math.min(46, slot * 0.58));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  const fillFor = (tone: ChartPoint["tone"]) => {
    if (tone === "red") return COLORS.red;
    if (tone === "amber") return COLORS.amber;
    if (tone === "slate") return COLORS.slate;
    return COLORS.green700;
  };

  return (
    <div className="kf-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = pad.top + innerH * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={COLORS.chartGrid} strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="kf-chart-axis">
                {Math.round(maxValue * fraction).toLocaleString()}
              </text>
            </g>
          );
        })}
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * innerH;
          const x = pad.left + slot * index + (slot - barWidth) / 2;
          const y = pad.top + innerH - barHeight;
          return (
            <g key={`${point.label}-${index}`}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} rx="5" fill={fillFor(point.tone)}>
                <title>{`${point.label}: ${point.value.toLocaleString()}${valueSuffix}`}</title>
              </rect>
              {index % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className="kf-chart-axis">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* =====================================================
   DONUT CHART
   ===================================================== */

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  emptyLabel = "No data recorded.",
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: ReactNode;
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);

  if (total <= 0) {
    return <div className="kf-chart-empty">{emptyLabel}</div>;
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="kf-donut">
      <div className="kf-donut-visual">
        <svg viewBox="0 0 140 140" role="img" aria-label="Breakdown chart">
          <circle cx="70" cy="70" r={radius} fill="none" stroke={COLORS.chartTrack} strokeWidth="16" />
          {segments.map((segment, index) => {
            const share = Math.max(0, segment.value) / total;
            const dash = share * circumference;
            const circle = (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color ?? PALETTE[index % PALETTE.length]}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform="rotate(-90 70 70)"
              >
                <title>{`${segment.label}: ${Math.round(share * 100)}%`}</title>
              </circle>
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="kf-donut-center">
          {centerValue && <strong>{centerValue}</strong>}
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      </div>
      <ul className="kf-donut-legend">
        {segments.map((segment, index) => (
          <li key={segment.label}>
            <span className="kf-donut-swatch" style={{ background: segment.color ?? PALETTE[index % PALETTE.length] }} />
            <span className="kf-donut-label">{segment.label}</span>
            <span className="kf-donut-value">{Math.round((Math.max(0, segment.value) / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =====================================================
   HORIZONTAL BARS
   ===================================================== */

export function HorizontalBars({
  items,
  valuePrefix = "",
  emptyLabel = "No data recorded.",
}: {
  items: { label: string; value: number; share?: number | null; color?: string }[];
  valuePrefix?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <div className="kf-chart-empty">{emptyLabel}</div>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="kf-bars">
      {items.map((item, index) => {
        const width = Math.max(2, Math.min(100, item.share ?? (item.value / max) * 100));
        return (
          <li key={`${item.label}-${index}`}>
            <div className="kf-bar-head">
              <span>{item.label}</span>
              <strong>
                {valuePrefix}
                {item.value.toLocaleString()}
                {item.share !== undefined && item.share !== null ? ` · ${Math.round(item.share)}%` : ""}
              </strong>
            </div>
            <div className="kf-bar-track">
              <div
                className="kf-bar-fill"
                style={{
                  width: `${width}%`,
                  background: item.color ?? PALETTE[index % PALETTE.length],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
