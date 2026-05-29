import { useState } from 'react';
import { Separator, Drawer } from '@heroui/react';
import { Banknote, Smartphone, Wallet, LogOut as LogOutIcon, Package as PackageIcon, User as UserIcon } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../features/auth/useAuth';
import { BrandLockup } from './BrandLockup';
import { DowntimeBanner } from './DowntimeBanner';
import { ForbiddenBanner } from './ForbiddenBanner';
import { Header } from './Header';
import { LiveRegion } from './LiveRegion';
import { MobileBottomNav } from './MobileBottomNav';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Global app shell — Header + outlet for route content + rich footer.
 * Consistent gutter scale per DESIGN_PRINCIPLES section 2 (px-4 / md:px-6 / lg:px-8).
 * Footer uses existing routes only — no fake pages or placeholder links.
 */
export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);

  const initials = (user?.fullName ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

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
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:pb-8 md:px-6 md:py-10 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-surface-secondary/40" aria-label={t('common.footer.quickLinks')}>
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
          {/* 4-column grid: Brand · Shop · Account · Support */}
          <div className="grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand column */}
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2">
                <BrandLockup size="sm" />
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

          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Separator orientation="horizontal" />

          {/* Copyright row */}
          <div className="py-5 text-center">
            <p className="text-sm text-muted">
              {t('common.footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>

      <MobileBottomNav onAccountPress={() => setIsMobileMenuOpen(true)} />
      <LiveRegion />

      {user && (
        <Drawer
          isOpen={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
        >
          <Drawer.Backdrop className="bg-background/80 backdrop-blur-sm z-50" />
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Drawer.Content placement="bottom" className="rounded-t-2xl border-t border-divider/60 bg-background pb-[max(1rem,env(safe-area-inset-bottom))] p-0 z-50">
            <Drawer.Dialog aria-label={t('common.accountMenu.account')} className="outline-none">
              {/* Premium Grabber Handle */}
              <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-default-300 dark:bg-default-700" />
              
              <div className="px-5 py-3">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-base font-bold text-brand">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="truncate text-base font-bold text-foreground leading-tight">{user.fullName}</p>
                    <p className="truncate text-sm text-muted leading-tight mt-1" dir="ltr">{user.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-3 py-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/account');
                  }}
                  className="flex items-center gap-3.5 w-full text-start px-4 py-3.5 rounded-xl text-sm font-medium text-default-700 hover:bg-default-100 hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
                >
                  <UserIcon className="size-5 text-default-500" aria-hidden />
                  <span>{t('common.accountMenu.myAccount')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/account/orders');
                  }}
                  className="flex items-center gap-3.5 w-full text-start px-4 py-3.5 rounded-xl text-sm font-medium text-default-700 hover:bg-default-100 hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
                >
                  <PackageIcon className="size-5 text-default-500" aria-hidden />
                  <span>{t('common.accountMenu.myOrders')}</span>
                </button>
                
                <div className="h-[1px] bg-divider/60 my-2 mx-4" />
                
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsConfirmingSignOut(true);
                  }}
                  className="flex items-center gap-3.5 w-full text-start px-4 py-3.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger-50 dark:hover:bg-danger-950/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <LogOutIcon className="size-5 text-danger/80" aria-hidden />
                  <span>{t('common.accountMenu.signOut')}</span>
                </button>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer>
      )}

      <ConfirmDialog
        isOpen={isConfirmingSignOut}
        onOpenChange={setIsConfirmingSignOut}
        title={t('common.accountMenu.signOutConfirmTitle')}
        description={t('common.accountMenu.signOutConfirmBody')}
        onConfirm={async () => {
          try {
            await logout();
          } catch {
            // Ignore error
          }
        }}
        confirmLabel={t('common.accountMenu.signOut')}
        cancelLabel={t('common.accountMenu.cancel')}
        variant="danger"
      />
    </div>
  );
}
