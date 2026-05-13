import { useTranslation } from 'react-i18next';

import { useAuth } from '../../features/auth/useAuth';

/**
 * The protected landing surface. Shows a personalized welcome plus the
 * mixed-script render test that proved out the typography stack in M0.
 *
 * Once we wire feature dashboards (M2+), this page will redirect by role.
 */
export function ShellPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user
            ? t('shell.welcomeBack', { name: user.fullName })
            : t('shell.welcome')}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-default-500">
          {user
            ? t('shell.subtitleSignedIn', { role: user.roles.join(', ') })
            : t('shell.subtitle')}
        </p>
      </section>

      <section
        className="rounded-large border border-divider/60 bg-content1 p-6"
        aria-labelledby="mixed-script-label"
      >
        <div className="space-y-2">
          <span
            id="mixed-script-label"
            className="text-xs font-medium uppercase tracking-wide text-default-400"
          >
            {t('shell.mixedScriptLabel')}
          </span>
          <p className="text-base">{t('shell.mixedScriptText')}</p>
          <p className="text-sm tabular-nums text-default-500">
            0 1 2 3 4 5 6 7 8 9 — 12,345.67 EGP
          </p>
        </div>
      </section>
    </div>
  );
}
