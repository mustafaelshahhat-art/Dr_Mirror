import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../features/auth/useAuth';

import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';

/**
 * Global header — hosts the LangSwitcher, ThemeToggle, and (when signed in)
 * the user's display name with a sign-out action.
 * Sticky, low-noise. Single backdrop-blur, single divider. No nested cards.
 */
export function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-divider/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">
            {t('appName')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {user ? (
            <>
              <span className="me-2 hidden text-sm text-default-500 sm:inline">
                {user.fullName}
              </span>
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
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
