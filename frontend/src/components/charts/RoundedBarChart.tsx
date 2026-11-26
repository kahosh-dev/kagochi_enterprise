// RoundedBarChart – grouped or stacked bars with rounded tops
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, grid, axis, semantic, animation } from './chartTheme';
import { formatNumber } from './formatters';

interface Series {
  dataKey: string;
  name: string;
  color?: string;
  stacked?: boolean;
}

interface RoundedBarChartProps {
  data: any[];
  series: Series[]; // definition of each series
  stacked?: boolean; // force stacked mode for all series
  barMaxWidth?: number; // 28‑36px typical
  threshold?: { value: number; label?: string }; // optional dashed line
}

export const RoundedBarChart: React.FC<RoundedBarChartProps> = ({
  data,
  series,
  stacked = false,
  barMaxWidth = 36,
  threshold,
}) => {
  // Determine bar width based on number of points (max 36, min 28)
  const barWidth = Math.max(28, Math.min(barMaxWidth, Math.floor(720 / Math.max(data.length, 1)) - 4));

  const isStacked = stacked || series.some((s) => s.stacked);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid.stroke} strokeWidth={grid.strokeWidth} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axis.tickColor }} axisLine={false} tickLine={false} />
        <YAxis tick={false} axisLine={false} tickLine={false} />
        <Tooltip content={<GlassTooltip />} />
        <Legend verticalAlign="top" height={36} />
        {threshold && (
          <ReferenceLine
            y={threshold.value}
            stroke={semantic.previous}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={threshold.label}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            stackId={isStacked ? 'stack' : undefined}
            radius={[4, 4, 0, 0]}
            barSize={barWidth}
            isAnimationActive={true}
            animationDuration={animation.duration}
            animationEasing={animation.easing}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={s.color || palette.slate} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
