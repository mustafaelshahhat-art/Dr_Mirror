import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';

import { useAuth } from '../../auth/useAuth';
import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

export function AdminHeader({ onMenuPress }: { onMenuPress: () => void }) {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-divider/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="md:hidden"
            onPress={onMenuPress}
            aria-label={t('admin.shell.navTitle')}
          >
            <Menu size={18} aria-hidden />
          </Button>
          <span className="text-sm font-semibold tracking-tight text-default-700 dark:text-default-300">
            {t('admin.hub.title')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {user ? (
            <span className="hidden text-sm text-default-500 sm:inline-block">
              {user.fullName}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => void logout()}
            aria-label={t('admin.shell.accountMenu.signOut')}
          >
            {t('admin.shell.accountMenu.signOut')}
          </Button>
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
