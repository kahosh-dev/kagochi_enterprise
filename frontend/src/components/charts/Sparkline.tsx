// Sparkline – tiny line chart without axes, used inside KPI cards
import React from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassTooltip } from './GlassTooltip';
import { palette, animation } from './chartTheme';

interface SparklineProps {
  data: any[]; // expects objects with {label?, value}
  color?: string;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color, height = 40 }) => {
  const lineColor = color || palette.purple;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={animation.duration} animationEasing={animation.easing} />
        <Tooltip content={<GlassTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
};
