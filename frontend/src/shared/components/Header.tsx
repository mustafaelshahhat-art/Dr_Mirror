import { useState } from 'react';
import { Link, Surface, Popover, PopoverTrigger, PopoverContent, Separator } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { User as UserIcon, LogOut as LogOutIcon, Package as PackageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { CartButton } from '../../features/cart/components/CartButton';

import { BrandLockup } from './BrandLockup';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmDialog } from './ConfirmDialog';

export function Header() {
  const { t } = useTranslation();
  const { user, isBootstrapping, isAdmin, logout } = useAuth();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);

  if (isAdmin) return null;

  const initials = (user?.fullName ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header role="banner">
      <Surface
        variant="transparent"
        className="sticky top-0 z-40 border-b border-divider/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-75"
            aria-label="Dr.Mirror"
          >
            <BrandLockup size="sm" />
          </Link>

          <nav
            aria-label={t('header.menuLabel')}
            className="hidden items-center gap-1 sm:flex"
          >
            {!isBootstrapping && user ? (
              <Popover isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger>
                  <button
                    type="button"
                    aria-label={user.fullName}
                    className="flex size-9 items-center justify-center rounded-full text-default-700 transition-colors hover:bg-default-100 hover:text-foreground dark:text-default-300 dark:hover:bg-default-50/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                  >
                    <UserIcon className="size-5 shrink-0" aria-hidden />
                  </button>
                </PopoverTrigger>
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <PopoverContent placement="bottom end" offset={8} className="w-64 p-0 border border-default-200/60 bg-background/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden focus:outline-none">
                  <div className="p-4 bg-default-50/50 dark:bg-default-50/5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1 text-start">
                        <p className="truncate text-sm font-semibold text-foreground leading-tight">{user.fullName}</p>
                        <p className="truncate text-xs text-muted leading-tight mt-1" dir="ltr">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Separator orientation="horizontal" className="opacity-60" />
                  <div className="p-2 space-y-0.5">
                    <RouterLink
                      to="/account"
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-3 w-full text-start px-3 py-2.5 rounded-xl text-sm text-default-700 hover:bg-default-100 hover:text-foreground active:scale-[0.98] transition-all"
                    >
                      <UserIcon className="size-4 text-default-500" aria-hidden />
                      <span>{t('common.accountMenu.myAccount')}</span>
                    </RouterLink>
                    <RouterLink
                      to="/account/orders"
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-3 w-full text-start px-3 py-2.5 rounded-xl text-sm text-default-700 hover:bg-default-100 hover:text-foreground active:scale-[0.98] transition-all"
                    >
                      <PackageIcon className="size-4 text-default-500" aria-hidden />
                      <span>{t('common.accountMenu.myOrders')}</span>
                    </RouterLink>
                  </div>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Separator orientation="horizontal" className="opacity-60" />
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setIsConfirmingSignOut(true);
                      }}
                      className="flex items-center gap-3 w-full text-start px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger-50 dark:hover:bg-danger-950/20 active:scale-[0.98] transition-all cursor-pointer font-medium"
                    >
                      <LogOutIcon className="size-4 text-danger/80" aria-hidden />
                      <span>{t('common.accountMenu.signOut')}</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            {!isBootstrapping && !user ? (
              <Link
                href="/login"
                className={`${buttonVariants({ variant: 'primary', size: 'sm' })} ms-1`}
              >
                {t('header.signIn')}
              </Link>
            ) : null}
            <div className="ms-1 flex items-center gap-1">
              <CartButton />
              <LangSwitcher />
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-1 sm:hidden">
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </Surface>

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
    </header>
  );
}
