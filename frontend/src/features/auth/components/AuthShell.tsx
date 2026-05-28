import { Shield, Truck, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { BrandLockup } from '../../../shared/components/BrandLockup';
import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

export function AuthShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {/* Brand panel — start side, ≥40% width, hidden below 768 px */}
      <aside className="relative hidden w-[42%] flex-col overflow-hidden md:flex" aria-hidden="true">
        {/* Brand wash gradient — from-brand/30 via-brand/10 to-transparent */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <div className="absolute inset-0 bg-gradient-to-b from-brand/30 via-brand/10 to-transparent" />
        </div>

        <div className="relative flex flex-1 flex-col gap-8 px-10 py-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-75"
            aria-label="Dr.Mirror"
          >
            <BrandLockup size="md" />
          </a>

          <div className="mt-auto space-y-6 pb-4">
            <p className="text-2xl font-semibold tracking-tight leading-snug sm:text-3xl">
              {t('auth.shell.tagline')}
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-muted">
                <Truck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {t('auth.shell.trust1')}
              </li>
              <li className="flex items-start gap-3 text-sm text-muted">
                <Shield className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {t('auth.shell.trust2')}
              </li>
              <li className="flex items-start gap-3 text-sm text-muted">
                <Wallet className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {t('auth.shell.trust3')}
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Form panel — end side, full width on mobile */}
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex min-h-14 w-full items-center justify-between gap-3 px-4 md:px-6">
            <a
              href="/"
              className="inline-flex min-w-0 shrink items-center gap-2 text-foreground no-underline transition-opacity hover:opacity-80"
              aria-label="Dr.Mirror"
            >
              <BrandLockup size="sm" />
            </a>
            <div className="flex shrink-0 flex-nowrap items-center gap-1">
              <LangSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
          <Outlet />
        </main>

        <footer className="border-t border-border/40 py-5 text-center text-sm text-muted">
          {t('common.footer.copyright', { year: new Date().getFullYear() })}
        </footer>
      </div>
    </div>
  );
}
