import { useTranslation } from 'react-i18next';
import { Chip } from '@heroui/react';

export type StatusColor = 'accent' | 'danger' | 'default' | 'success' | 'warning' | 'primary';

interface StatusPillProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  colorScheme?: StatusColor;
}

export function StatusPill({ active, activeLabel, inactiveLabel, colorScheme }: StatusPillProps) {
  const { t } = useTranslation();
  
  // Map colorScheme to CSS classes for compatibility
  const color = colorScheme ?? (active ? 'success' : 'default');
  const classes = 
    color === 'success' ? 'border-success/30 bg-success/15 text-success' :
    color === 'danger' ? 'border-danger/30 bg-danger/15 text-danger' :
    color === 'warning' ? 'border-warning/30 bg-warning/15 text-warning' :
    color === 'accent' || color === 'primary' ? 'border-brand/30 bg-brand/15 text-brand' :
    'border-default/30 bg-default/15 text-default-500';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        classes,
      ].join(' ')}
    >
      {active
        ? activeLabel ?? t('admin.catalog.status.active')
        : inactiveLabel ?? t('admin.catalog.status.inactive')}
    </span>
  );
}

interface StatusBadgeProps {
  color: StatusColor;
  label: string;
  className?: string;
}

export function StatusBadge({ color, label, className }: StatusBadgeProps) {
  const mappedColor = (color === 'primary' || color === 'accent') ? 'accent' : color;
  
  return (
    <Chip 
      color={mappedColor as 'default' | 'accent' | 'success' | 'warning' | 'danger'} 
      variant="soft" 
      size="sm" 
      className={className}
    >
      <Chip.Label className="truncate whitespace-normal break-words">
        {label}
      </Chip.Label>
    </Chip>
  );
}
