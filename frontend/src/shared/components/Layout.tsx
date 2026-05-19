import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { DowntimeBanner } from './DowntimeBanner';
import { ForbiddenBanner } from './ForbiddenBanner';
import { Header } from './Header';
import { LiveRegion } from './LiveRegion';

/**
 * Global app shell — Header + outlet for route content. Consistent gutter
 * scale per DESIGN_PRINCIPLES section 2 (px-4 / md:px-6 / lg:px-8). One container,
 * no nested cards.
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
      <footer className="border-t border-divider/60 bg-surface-secondary/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row md:px-6 lg:px-8">
          <span className="text-sm font-semibold tracking-tight text-foreground/70">
            {t('appName')}
          </span>
          <p className="text-xs text-muted">
            {t('common.footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
      <LiveRegion />
    </div>
  );
}
