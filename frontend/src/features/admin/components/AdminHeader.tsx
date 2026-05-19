import { Breadcrumbs, Button, Tooltip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/useAuth';
import { LangSwitcher } from '../../../shared/components/LangSwitcher';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { getAdminHeaderTitleKeys } from '../adminNav';
import { ADMIN_HEADER_HEIGHT_CLASS } from './adminShellTokens';

export function AdminHeader({ onMenuPress }: { onMenuPress: () => void }) {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const titleKeys = getAdminHeaderTitleKeys(location.pathname);

  if (!isAdmin) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-divider/60 bg-content1">
      <div className={['flex items-center justify-between gap-3 px-4 md:px-6', ADMIN_HEADER_HEIGHT_CLASS].join(' ')}>
        <div className="flex items-center gap-2">
          <Tooltip>
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
            <Tooltip.Content placement="bottom">{t('admin.shell.navTitle')}</Tooltip.Content>
          </Tooltip>
          <Breadcrumbs
            aria-label={t('admin.shell.breadcrumbs')}
            className="text-sm font-semibold tracking-tight text-default-700 dark:text-default-300"
          >
            {titleKeys.map((key) => (
              <Breadcrumbs.Item key={key}>{t(key)}</Breadcrumbs.Item>
            ))}
          </Breadcrumbs>
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
