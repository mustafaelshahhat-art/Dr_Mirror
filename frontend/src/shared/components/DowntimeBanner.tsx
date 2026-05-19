import { Alert, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { CloudOff, X } from 'lucide-react';

import { useDowntime } from '../hooks/useDowntime';
import { ContactSupportLink } from './ContactSupportLink';

export function DowntimeBanner() {
  const { t } = useTranslation();
  const { isDowntime, dismiss } = useDowntime();

  if (!isDowntime) return null;

  return (
    <Alert
      status="danger"
      role="alert"
      className="enter-fade-down rounded-none border-0 border-b border-danger/30 px-4 py-2 text-sm"
    >
      <Alert.Indicator>
        <CloudOff size={16} aria-hidden className="shrink-0" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{t('errors.downtime.title')}</Alert.Title>
        <Alert.Description>
          {t('errors.downtime.detail')} <ContactSupportLink />
        </Alert.Description>
      </Alert.Content>
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
    </Alert>
  );
}
