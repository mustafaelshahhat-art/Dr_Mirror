import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { CloudOff, X } from 'lucide-react';

import { useDowntime } from '../hooks/useDowntime';
import { ContactSupportLink } from './ContactSupportLink';

export function DowntimeBanner() {
  const { t } = useTranslation();
  const { isDowntime, dismiss } = useDowntime();

  if (!isDowntime) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger"
    >
      <CloudOff size={16} aria-hidden className="shrink-0" />
      <span className="flex-1">
        <span className="font-medium">{t('errors.downtime.title')}</span>
        {' '}
        {t('errors.downtime.detail')}
        {' '}
        <ContactSupportLink />
      </span>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        onPress={dismiss}
        className="h-7 min-w-7 shrink-0 text-danger hover:bg-danger/20"
        aria-label={t('common.dismiss')}
      >
        <X size={14} aria-hidden />
      </Button>
    </div>
  );
}
