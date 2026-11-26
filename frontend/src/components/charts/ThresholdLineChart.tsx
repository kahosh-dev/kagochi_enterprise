// ThresholdLineChart – bars for values with a dashed line for a threshold (e.g., acceptable mortality rate)
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
  ReferenceLine,
  } from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, grid, axis, animation, semantic } from './chartTheme';

interface ThresholdLineChartProps {
  data: any[]; // expects {label, value}
  threshold: number; // y‑value for the dashed line
  thresholdLabel?: string;
  barColor?: string;
}

export const ThresholdLineChart: React.FC<ThresholdLineChartProps> = ({
  data,
  threshold,
  thresholdLabel,
  barColor = palette.coral,
}) => {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid.stroke} strokeWidth={grid.strokeWidth} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axis.tickColor }} axisLine={false} tickLine={false} />
        <YAxis tick={false} axisLine={false} tickLine={false} />
        <Tooltip content={<GlassTooltip />} />
        <Legend verticalAlign="top" height={36} />
        <ReferenceLine
          y={threshold}
          stroke={semantic.previous}
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
          label={thresholdLabel}
        />
        <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={animation.duration} animationEasing={animation.easing} />
      </BarChart>
    </ResponsiveContainer>
  );
};
