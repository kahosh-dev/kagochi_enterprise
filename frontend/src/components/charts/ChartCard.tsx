import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../ui'; // assume UI components exist
import { Download } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onInfo?: () => void;
  downloadRef?: React.RefObject<HTMLDivElement>; // ref to chart container for PNG export
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error,
  empty = false,
  onInfo,
  downloadRef,
}) => {
  return (
    <Card className="kf-chart-card">
      <CardHeader className="flex flex-col space-y-2">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            {onInfo && (
              <Button variant="ghost" size="sm" onClick={onInfo} aria-label="Info">
                i
              </Button>
            )}
            <Button variant="ghost" size="sm" aria-label="Download chart as PNG" onClick={() => {
              // Simple placeholder – actual export would use html2canvas or similar.
              // The consumer can implement the export logic using the ref.
              if (downloadRef?.current) {
                // @ts-ignore – placeholder
                console.warn('Download requested – implement export using html2canvas');
              }
            }}>
              <Download size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="p-4" ref={downloadRef as any}>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">Loading chart…</div>
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-destructive">Error: {error}</div>
        ) : empty ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">No data for this period.</div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
};
