import { Link as HeroLink } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

export function AuthShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-divider/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          <HeroLink
            href="/"
            className="inline-flex min-w-0 shrink items-center gap-2 text-foreground no-underline"
          >
            <img
              src="/favicon.svg"
              alt={t('appName')}
              className="h-8 w-8 shrink-0 rounded-small"
            />
            <span className="truncate text-base font-semibold tracking-tight">
              {t('appName')}
            </span>
          </HeroLink>

          <div className="flex shrink-0 flex-nowrap items-center gap-1">
            <HeroLink
              href="/"
              className="inline-flex whitespace-nowrap px-1 py-1 text-sm text-default-600 underline-offset-4 hover:underline sm:px-2 dark:text-default-300"
            >
              {t('auth.backToStore')}
            </HeroLink>
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-xs text-muted">
        {t('common.footer.copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
