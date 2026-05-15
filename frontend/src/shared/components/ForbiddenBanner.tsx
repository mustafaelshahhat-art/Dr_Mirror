import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';

import { getForbiddenMessage, setForbiddenMessage, subscribe } from '../../shared/lib/forbidden-store';

export function ForbiddenBanner() {
  const { t } = useTranslation();
  const msg = useSyncExternalStore(subscribe, getForbiddenMessage);

  if (!msg) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning"
    >
      <AlertTriangle size={16} aria-hidden className="shrink-0" />
      <span className="flex-1">{t('admin.shell.forbidden.title')}</span>
      <button
        type="button"
        onClick={() => setForbiddenMessage(null)}
        className="shrink-0 rounded-sm p-0.5 transition-colors hover:bg-warning/20"
        aria-label="Dismiss"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
