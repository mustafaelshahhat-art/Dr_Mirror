import { Link as HeroLink } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

export function AuthShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-divider/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          <HeroLink
            href="/"
            className="inline-flex min-w-0 shrink items-center gap-2 text-foreground no-underline transition-opacity hover:opacity-80"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm shadow-brand/20"
              aria-hidden
            >
              <Plus className="size-4" />
            </span>
            <span className="truncate text-base font-semibold tracking-tight">
              {t('appName')}
            </span>
          </HeroLink>

          <div className="flex shrink-0 flex-nowrap items-center gap-1">
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-brand/[3] to-transparent" />
        </div>
        <Outlet />
      </main>

      <footer className="border-t border-divider/40 py-5 text-center text-xs text-muted">
        {t('common.footer.copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
