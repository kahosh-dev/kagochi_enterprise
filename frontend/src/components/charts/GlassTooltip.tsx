import React from 'react';
import type { TooltipProps } from 'recharts';
import { formatNumber, formatUnit, formatDate } from './formatters';
import { palette, semantic, tooltip as tooltipStyle } from './chartTheme';

export const GlassTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="glass-tooltip"
      style={{
        background: tooltipStyle.bg,
        color: tooltipStyle.color,
        borderRadius: tooltipStyle.borderRadius,
        padding: tooltipStyle.padding,
        boxShadow: tooltipStyle.boxShadow,
        fontSize: '0.875rem',
      }}
    >
      <div className="font-medium mb-1">{formatDate(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center space-x-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color || palette.slate }}
          ></span>
          <span className="text-sm">{p.name}:</span>
          <span className="font-medium">{formatNumber(p.value)}</span>
          {p.value && p.unit && <span className="text-xs">{formatUnit(p.unit)}</span>}
          {/* placeholder for previous‑period delta – assumes payload includes `prev` */}
          {p.payload && p.payload.prev != null && (
            <span className="ml-2 text-xs" style={{ color: p.value >= p.payload.prev ? semantic.income : semantic.expense }}>
              {(p.value - p.payload.prev >= 0 ? '+' : '') + ((p.value - p.payload.prev) / p.payload.prev * 100).toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
