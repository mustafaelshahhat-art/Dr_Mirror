import { Link, Surface } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { CartButton } from '../../features/cart/components/CartButton';

import { BrandMark } from './BrandMark';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { t } = useTranslation();
  const { user, isBootstrapping, isAdmin } = useAuth();

  if (isAdmin) return null;

  return (
    <header role="banner">
      <Surface
        variant="transparent"
        className="sticky top-0 z-40 border-b border-divider/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight transition-opacity hover:opacity-75 sm:text-lg"
          >
            <BrandMark size={20} />
            <span className="hidden xs:inline">{t('appName')}</span>
          </Link>

          <nav
            aria-label={t('header.menuLabel')}
            className="hidden items-center gap-1 sm:flex"
          >
            {!isBootstrapping && user ? (
              <RouterLink
                to="/account"
                aria-label={user.fullName}
                className="flex size-9 items-center justify-center rounded-full text-default-700 transition-colors hover:bg-default-100 hover:text-foreground dark:text-default-300 dark:hover:bg-default-50/10"
              >
                <UserIcon className="size-5 shrink-0" aria-hidden />
              </RouterLink>
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
            <CartButton />
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </Surface>
    </header>
  );
}
