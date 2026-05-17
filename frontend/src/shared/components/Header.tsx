import { Button, Drawer } from '@heroui/react';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { CartButton } from '../../features/cart/components/CartButton';

import { LangSwitcher } from './LangSwitcher';
import { LinkButton } from './LinkButton';
import { ThemeToggle } from './ThemeToggle';

/**
 * Global header — hosts the brand link, auth-aware account/sign-in entry,
 * LangSwitcher, and ThemeToggle. Sticky, low-noise. Single backdrop-blur,
 * single divider. No nested cards.
 *
 * On narrow screens (< sm) all secondary controls collapse into a HeroUI
 * Drawer reached via a single hamburger button — the visible row stays at
 * brand + cart + menu, comfortably 44 px tap targets even in Arabic.
 */
export function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout, isBootstrapping, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const placement = i18n.dir() === 'rtl' ? 'left' : 'right';

  if (isAdmin) return null;
  return (
    <header className="sticky top-0 z-40 border-b border-divider/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <Link
          to="/"
          className="text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          {t('appName')}
        </Link>

        {/* Desktop row — unchanged density, every control visible. */}
        <div className="hidden items-center gap-1 sm:flex">
          <Link
            to="/inquiries"
            className="me-1 rounded-medium px-3 py-1.5 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300"
          >
            {t('header.contact')}
          </Link>

          {!isBootstrapping && user ? (
            <>
              <Link
                to="/account"
                className="me-2 rounded-medium px-3 py-1.5 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300"
              >
                {user.fullName}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => void logout()}
                aria-label={t('auth.signOut')}
              >
                {t('auth.signOut')}
              </Button>
            </>
          ) : null}

          {!isBootstrapping && !user ? (
            <LinkButton to="/login" size="sm" className="me-2">
              {t('header.signIn')}
            </LinkButton>
          ) : null}

          <CartButton />
          <LangSwitcher />
          <ThemeToggle />
        </div>

        {/* Mobile row — only brand + cart + hamburger stay visible. */}
        <div className="flex items-center gap-1 sm:hidden">
          <CartButton />
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label={t('header.openMenu')}
            onPress={() => setMenuOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <Drawer isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement={placement} className="w-full max-w-sm">
            <Drawer.Dialog className="flex h-full flex-col">
              <Drawer.Header className="border-b border-divider/60 px-4 py-3">
                <Drawer.Heading className="text-base font-semibold">
                  {t('appName')}
                </Drawer.Heading>
                <p className="mt-0.5 text-xs text-default-500">{t('header.menuSubtitle')}</p>
              </Drawer.Header>

              <Drawer.Body className="flex-1 overflow-y-auto px-2 py-3">
                <nav aria-label={t('header.menuLabel')} className="flex flex-col gap-1">
                  <Link
                    to="/inquiries"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-medium px-3 py-2 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300"
                  >
                    {t('header.contact')}
                  </Link>
                  {!isBootstrapping && user ? (
                    <Link
                      to="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-medium px-3 py-2 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300"
                    >
                      <UserIcon className="size-4" aria-hidden />
                      <span className="truncate">{user.fullName}</span>
                    </Link>
                  ) : null}
                  {!isBootstrapping && !user ? (
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center rounded-medium px-3 py-2 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300"
                    >
                      {t('header.signIn')}
                    </Link>
                  ) : null}
                </nav>

                <hr className="my-3 border-divider/60" />

                <div className="space-y-2 px-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-wide text-default-500">
                      {t('header.switchLanguage')}
                    </span>
                    <LangSwitcher />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-wide text-default-500">
                      {t('header.switchTheme')}
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </Drawer.Body>

              {!isBootstrapping && user ? (
                <Drawer.Footer className="border-t border-divider/60 px-4 py-3">
                  <Button
                    variant="ghost"
                    fullWidth
                    onPress={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    aria-label={t('auth.signOut')}
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogOut className="size-4 rtl:rotate-180" aria-hidden />
                      {t('auth.signOut')}
                    </span>
                  </Button>
                </Drawer.Footer>
              ) : null}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </header>
  );
}
