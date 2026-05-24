import { useTranslation } from 'react-i18next';

interface StatusPillProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusPill({ active, activeLabel, inactiveLabel }: StatusPillProps) {
  const { t } = useTranslation();

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        active
          ? 'border-success/30 bg-success/15 text-success'
          : 'border-default/30 bg-default/15 text-default-500',
      ].join(' ')}
    >
      {active
        ? activeLabel ?? t('admin.catalog.status.active')
        : inactiveLabel ?? t('admin.catalog.status.inactive')}
    </span>
  );
}
