import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, grid, axis, animation } from './chartTheme';

interface SmoothAreaChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
  name?: string;
  unit?: string;
  color?: string; // hex color for area line and fill
}

export const SmoothAreaChart: React.FC<SmoothAreaChartProps> = ({
  data,
  xKey = 'label',
  yKey = 'value',
  name = '',
  unit = '',
  color,
}) => {
  const lineColor = color || palette.purple;
  const gradientId = `areaGrad-${lineColor.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={grid.stroke} strokeWidth={grid.strokeWidth} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: axis.tickColor }} axisLine={false} tickLine={false} />
        <YAxis tick={false} axisLine={false} tickLine={false} />
        <Tooltip content={<GlassTooltip />} />
        {name && <Legend verticalAlign="top" height={36} />}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={lineColor}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
