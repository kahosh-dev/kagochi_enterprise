// DonutChart – shows total in centre, segments with label and value
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, animation } from './chartTheme';
import { formatNumber } from './formatters';

interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: React.ReactNode;
  emptyLabel?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  centerLabel,
  centerValue,
  emptyLabel = 'No data recorded.',
}) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) return <div className="kf-chart-empty">{emptyLabel}</div>;

  // const colors = segments.map((s, i) => s.color || palette.slate);
  const radius = 80;
  const innerRadius = 50;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip content={<GlassTooltip />} />
        <Pie
          data={segments}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={radius}
          innerRadius={innerRadius}
          isAnimationActive={true}
          animationDuration={animation.duration}
          animationEasing={animation.easing}
        >
          {segments.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || palette.slate} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} />
        {/* centre overlay */}
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
          {centerValue ?? formatNumber(total)}
        </text>
        {centerLabel && (
          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.9rem', fill: '#666' }}>
            {centerLabel}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};
