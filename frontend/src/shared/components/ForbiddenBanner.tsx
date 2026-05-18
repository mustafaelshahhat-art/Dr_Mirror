import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';

import { getForbiddenMessage, setForbiddenMessage, subscribe } from '../../shared/lib/forbidden-store';

export function ForbiddenBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const messageState = useRef<{
    message: string;
    locationKey: string;
    hasLanded: boolean;
  } | null>(getForbiddenMessage()
    ? { message: getForbiddenMessage()!, locationKey: location.key, hasLanded: true }
    : null);
  const msg = useSyncExternalStore(subscribe, getForbiddenMessage);

  useEffect(() => {
    if (!msg) {
      messageState.current = null;
      return;
    }

    if (messageState.current?.message !== msg) {
      messageState.current = { message: msg, locationKey: location.key, hasLanded: false };
      return;
    }

    if (messageState.current.locationKey === location.key) return;

    if (!messageState.current.hasLanded) {
      messageState.current = { ...messageState.current, locationKey: location.key, hasLanded: true };
      return;
    }

    setForbiddenMessage(null);
  }, [location.key, msg]);

  if (!msg) return null;

  return (
    <div
      role="alert"
      className="enter-fade-down flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning"
    >
      <AlertTriangle size={16} aria-hidden className="shrink-0" />
      <span className="flex-1">{msg}</span>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        onPress={() => setForbiddenMessage(null)}
        className="h-7 min-w-7 shrink-0 text-warning hover:bg-warning/20"
        aria-label={t('common.dismiss')}
      >
        <X size={14} aria-hidden />
      </Button>
    </div>
  );
}
