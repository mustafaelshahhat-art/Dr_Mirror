import { Button } from '@heroui/react';
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
 */
export function Header() {
  const { t } = useTranslation();
  const { user, logout, isBootstrapping, isAdmin } = useAuth();

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

        <div className="flex items-center gap-1">
          <Link
            to="/inquiries"
            className="me-1 hidden rounded-medium px-3 py-1.5 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 sm:inline-block"
          >
            {t('header.contact')}
          </Link>
          <Link
            to="/inquiries"
            className="rounded-medium px-2 py-1.5 text-xs text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 sm:hidden"
          >
            {t('header.contact')}
          </Link>

          {!isBootstrapping && user ? (
            <>
              <Link
                to="/account"
                className="me-2 hidden rounded-medium px-3 py-1.5 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 sm:inline-block"
              >
                {user.fullName}
              </Link>
              <Link
                to="/account"
                className="rounded-medium px-2 py-1.5 text-xs text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 sm:hidden"
              >
                {t('header.myAccount')}
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
            <LinkButton
              to="/login"
              size="sm"
              className="me-2"
            >
              {t('header.signIn')}
            </LinkButton>
          ) : null}

          <CartButton />
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
