import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { CartButton } from '../../features/cart/components/CartButton';

import { LangSwitcher } from './LangSwitcher';
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

          {!isBootstrapping && user ? (
            <>
              <Link
                to="/account"
                className="me-2 hidden rounded-medium px-3 py-1.5 text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 sm:inline-block"
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
            <Link
              to="/login"
              className="me-2 inline-flex items-center rounded-medium bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t('header.signIn')}
            </Link>
          ) : null}

          <CartButton />
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
