import React from 'react';
import { formatNumber, formatUnit, formatDate } from './formatters';
import { palette, semantic, tooltip as tooltipStyle } from './chartTheme';

interface TooltipEntry {
  color?: string;
  name?: string | number;
  value?: number | string;
  unit?: string;
  payload?: {
    prev?: number | string | null;
  };
}

interface GlassTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  defaultUnit?: string;
}

export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  active,
  payload,
  label,
  defaultUnit,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

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
      {label != null && (
        <div className="font-medium mb-1">
          {formatDate(String(label))}
        </div>
      )}

      {payload.map((p, i) => {
        const currentValue = Number(p.value);
        const previousValue = Number(p.payload?.prev);

        const hasPrevious =
          p.payload?.prev != null &&
          Number.isFinite(currentValue) &&
          Number.isFinite(previousValue) &&
          previousValue !== 0;

        const percentageChange = hasPrevious
          ? ((currentValue - previousValue) / previousValue) * 100
          : null;

        const unit = p.unit || defaultUnit;

        return (
          <div key={i} className="flex items-center space-x-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: p.color || palette.slate,
              }}
            />

            <span className="text-sm">{p.name}:</span>

            <span className="font-medium">
              {formatNumber(p.value ?? '-')}
            </span>

            {unit && (
              <span className="text-xs">{formatUnit(unit)}</span>
            )}

            {percentageChange !== null && (
              <span
                className="ml-2 text-xs"
                style={{
                  color:
                    percentageChange >= 0
                      ? semantic.income
                      : semantic.expense,
                }}
              >
                {percentageChange >= 0 ? '+' : ''}
                {percentageChange.toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};