import { Chip } from '@heroui/react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatTrendDirection = 'up' | 'down' | 'flat';

export interface StatTrend {
  direction: StatTrendDirection;
  label: ReactNode;
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  trend?: StatTrend;
  size?: 'md' | 'sm';
  className?: string;
}

type ChipColor = 'success' | 'danger' | 'default';

function trendColor(direction: StatTrendDirection): ChipColor {
  if (direction === 'up') return 'success';
  if (direction === 'down') return 'danger';
  return 'default';
}

function TrendIcon({ direction }: { direction: StatTrendDirection }) {
  if (direction === 'up') return <ArrowUp className="size-3" aria-hidden />;
  if (direction === 'down') return <ArrowDown className="size-3" aria-hidden />;
  return <Minus className="size-3" aria-hidden />;
}

export function Stat({ label, value, trend, size = 'md', className }: StatProps) {
  return (
    <div
      className={[
        'stat-card flex flex-col gap-1.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="stat-label">{label}</span>
      <span className={size === 'sm' ? 'stat-value-sm' : 'stat-value'}>{value}</span>
      {trend && (
        <Chip color={trendColor(trend.direction)} variant="soft" size="sm">
          <Chip.Label className="flex items-center gap-1">
            <TrendIcon direction={trend.direction} />
            {trend.label}
          </Chip.Label>
        </Chip>
      )}
    </div>
  );
}
