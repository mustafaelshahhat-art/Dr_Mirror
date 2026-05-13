import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

/**
 * Shared chrome for /login and /register: a centered narrow card on a clean
 * canvas, with the app name + locale/theme controls in the top corners.
 * Public-only — never rendered while authenticated (PublicOnlyRoute enforces it).
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <span className="text-base font-semibold tracking-tight">{t('appName')}</span>
        <div className="flex items-center gap-1">
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-default-500">{subtitle}</p>
            ) : null}
          </div>
          {children}
          {footer ? <div className="text-center text-sm text-default-500">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
