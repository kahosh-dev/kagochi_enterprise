// HorizontalBarChart – bars displayed horizontally (useful for animal counts)
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
} from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, grid, axis, animation } from './chartTheme';

interface Item {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  items: Item[];
  emptyLabel?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ items, emptyLabel = 'No data recorded.' }) => {
  if (items.length === 0) return <div className="kf-chart-empty">{emptyLabel}</div>;

  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, items.length * 30)}>
      <BarChart
        layout="vertical"
        data={items}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        barCategoryGap="15%"
      >
        <CartesianGrid vertical={false} stroke={grid.stroke} strokeWidth={grid.strokeWidth} />
        <XAxis type="number" domain={[0, max]} tick={false} axisLine={false} tickLine={false} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: axis.tickColor }} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<GlassTooltip />} />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={animation.duration} animationEasing={animation.easing}>
          {items.map((entry, i) => (
            <Cell key={i} fill={entry.color || palette.slate} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
