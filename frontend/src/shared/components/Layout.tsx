import { Separator } from '@heroui/react';
import { Plus } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { DowntimeBanner } from './DowntimeBanner';
import { ForbiddenBanner } from './ForbiddenBanner';
import { Header } from './Header';
import { LiveRegion } from './LiveRegion';

/**
 * Global app shell — Header + outlet for route content + rich footer.
 * Consistent gutter scale per DESIGN_PRINCIPLES section 2 (px-4 / md:px-6 / lg:px-8).
 * Footer uses existing routes only — no fake pages or placeholder links.
 */
export function Layout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-medium focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t('common.a11y.skipToContent')}
      </a>
      <DowntimeBanner />
      <ForbiddenBanner />
      <Header />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-divider/60 bg-surface-secondary/40" aria-label={t('common.footer.quickLinks')}>
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
          {/* Main footer grid */}
          <div className="grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex size-6 items-center justify-center rounded-md bg-brand text-white"
                  aria-hidden
                >
                  <Plus className="size-3.5" />
                </span>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  {t('appName')}
                </span>
              </div>
              <p className="max-w-xs text-xs leading-relaxed text-muted">
                {t('common.footer.tagline')}
              </p>
            </div>

            {/* Quick links column */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                {t('common.footer.quickLinks')}
              </h2>
              <ul className="space-y-2" role="list">
                <li>
                  <Link
                    to="/"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {t('common.footer.browseCatalog')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cart"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {t('common.footer.cart')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/orders"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {t('common.footer.account')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/inquiries"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {t('common.footer.contact')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support column */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                {t('common.footer.support')}
              </h2>
              <p className="text-xs leading-relaxed text-muted">
                {t('common.footer.supportLine')}
              </p>
              <Link
                to="/inquiries"
                className="inline-flex text-sm font-medium text-brand transition-opacity hover:opacity-80"
              >
                {t('common.footer.contactPage')} →
              </Link>
            </div>
          </div>

          <Separator orientation="horizontal" />

          {/* Bottom strip */}
          <div className="flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
            <p className="text-xs text-muted">
              {t('common.footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>

      <LiveRegion />
    </div>
  );
}
