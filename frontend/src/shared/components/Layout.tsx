import { Separator } from '@heroui/react';
import { Banknote, Smartphone, Wallet } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { BrandMark } from './BrandMark';
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

      <footer className="border-t border-border/60 bg-surface-secondary/40" aria-label={t('common.footer.quickLinks')}>
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
          {/* 4-column grid: Brand · Shop · Account · Support */}
          <div className="grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand column */}
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-tight">
                <BrandMark size={20} />
                {t('appName')}
              </span>
              <p className="max-w-xs text-sm leading-relaxed text-muted">
                {t('common.footer.tagline')}
              </p>
              {/* Payment affordances row */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Banknote className="size-4 shrink-0" aria-hidden />
                  {t('common.payment.cod.label')}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Smartphone className="size-4 shrink-0" aria-hidden />
                  {t('common.payment.instapay.label')}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Wallet className="size-4 shrink-0" aria-hidden />
                  {t('common.payment.wallet.label')}
                </span>
              </div>
              <p className="text-sm text-muted">{t('common.governorateCaption')}</p>
            </div>

            {/* Shop column */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('common.footer.shop.title')}
              </h2>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-muted transition-colors hover:text-foreground">
                    {t('common.footer.browseCatalog')}
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="text-sm text-muted transition-colors hover:text-foreground">
                    {t('common.footer.cart')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account column */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('common.footer.accountNav.title')}
              </h2>
              <ul className="space-y-2">
                <li>
                  <Link to="/account/orders" className="text-sm text-muted transition-colors hover:text-foreground">
                    {t('common.account.myOrders.title')}
                  </Link>
                </li>
                <li>
                  <Link to="/account/addresses" className="text-sm text-muted transition-colors hover:text-foreground">
                    {t('common.account.addresses.title')}
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="text-sm text-muted transition-colors hover:text-foreground">
                    {t('common.footer.account')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support column */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('common.footer.support')}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t('common.footer.supportLine')}
              </p>
              <Link
                to="/inquiries"
                className="inline-flex text-sm font-medium text-brand transition-opacity hover:opacity-80"
              >
                {t('common.footer.contactPage')}
              </Link>
            </div>
          </div>

          <Separator orientation="horizontal" />

          {/* Copyright row */}
          <div className="py-5 text-center">
            <p className="text-sm text-muted">
              {t('common.footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>

      <LiveRegion />
    </div>
  );
}
