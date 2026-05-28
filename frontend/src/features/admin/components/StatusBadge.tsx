import { Chip } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function StatusBadge({
  variant,
  label,
  icon: Icon,
  className = '',
}: StatusBadgeProps) {
  const colorMap = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'accent',
    neutral: 'default',
  } as const;

  const color = colorMap[variant];

  return (
    <Chip
      color={color}
      size="sm"
      variant="soft"
      className={`border border-divider/10 font-semibold ${className}`}
    >
      <Chip.Label className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3" aria-hidden />}
        <span>{label}</span>
      </Chip.Label>
    </Chip>
  );
}
