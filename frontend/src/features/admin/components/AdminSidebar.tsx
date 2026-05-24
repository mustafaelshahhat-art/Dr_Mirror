import { Drawer, Tooltip } from '@heroui/react';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '../../../features/auth/useAuth';
import { BrandMark } from '../../../shared/components/BrandMark';

import { ADMIN_DRAWER_HEIGHT_CLASS, ADMIN_HEADER_OFFSET_CLASS } from './adminShellTokens';
import { ADMIN_NAV_GROUPS } from '../adminNav';

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const initials = (user?.fullName ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  const [isLg, setIsLg] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const listener = (e: MediaQueryListEvent) => setIsLg(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return (
    <>
      <div className="hidden md:w-[60px] lg:w-60 flex-col border-e border-border/50 bg-surface md:flex sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto transition-all duration-300">
        {/* Sidebar header — BrandMark + product name */}
        <div className="flex items-center justify-center lg:justify-start gap-2 border-b border-border/40 px-4 py-3.5 h-[53px]">
          <BrandMark size={20} title="Dr Mirror" />
          <span className="text-sm font-bold tracking-tight hidden lg:inline">{t('appName')}</span>
        </div>
        <SidebarNav label={t('admin.shell.navTitle')} onClose={onClose} isLg={isLg} />
        {/* Identity footer */}
        {user && (
          <div className="border-t border-border/40 px-3 py-3 flex justify-center lg:justify-start">
            <div className="flex items-center gap-2.5 w-full justify-center lg:justify-start">
              {isLg ? (
                <>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{user.fullName}</p>
                    <p className="truncate text-xs text-muted" dir="ltr">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={t('admin.shell.accountMenu.signOut')}
                    onClick={() => void logout()}
                    className="flex size-7 shrink-0 items-center justify-center rounded-medium text-muted transition-colors hover:text-danger"
                  >
                    <LogOut className="size-3.5" aria-hidden />
                  </button>
                </>
              ) : (
                <Tooltip>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="group flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand hover:bg-danger-50 dark:hover:bg-danger-950/20 hover:text-danger transition-all duration-300"
                  >
                    <span className="group-hover:hidden">{initials}</span>
                    <LogOut className="hidden group-hover:block size-4" aria-hidden />
                  </button>
                  <Tooltip.Content placement="right">{t('admin.shell.accountMenu.signOut')}</Tooltip.Content>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </div>

      <Drawer isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <Drawer.Backdrop
          variant="transparent"
          className={['bg-background/70', ADMIN_HEADER_OFFSET_CLASS, ADMIN_DRAWER_HEIGHT_CLASS].join(' ')}
        >
          <Drawer.Content
            placement={i18n.dir() === "rtl" ? "right" : "left"}
            className={[
              'w-56 max-w-xs rounded-none border-divider/60 bg-background p-0 data-[placement=left]:border-e data-[placement=right]:border-s',
              ADMIN_HEADER_OFFSET_CLASS,
              ADMIN_DRAWER_HEIGHT_CLASS,
            ].join(' ')}
          >
            <Drawer.Dialog aria-label={t('admin.shell.navTitleMobile')} className="flex h-full flex-col outline-none">
              <Drawer.Header className="flex items-center justify-between border-b border-divider/60 px-3 py-3">
                <Drawer.Heading className="text-sm font-semibold tracking-tight text-foreground">
                  {t('admin.shell.navTitle')}
                </Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="p-0">
                <SidebarNav label={t('admin.shell.navTitleMobile')} onClose={onClose} isLg={true} />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}

function SidebarNav({ label, onClose, isLg }: { label: string; onClose?: () => void; isLg: boolean }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={label} className="flex flex-1 flex-col overflow-y-auto px-2 pb-4 pt-2 gap-1 items-center lg:items-stretch">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.groupKey} className="w-full">
          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-default-500 hidden lg:block">
            {t(`admin.shell.nav.groups.${group.groupKey}`)}
          </p>
          <div className="flex flex-col gap-0.5 w-full items-center lg:items-stretch">
            {group.items.map(({ to, icon: Icon, labelKey, end }) => (
              <NavItem key={to} to={to} icon={Icon} label={t(labelKey)} end={end} onClick={onClose} isLg={isLg} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  onClick,
  isLg,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  onClick?: () => void;
  isLg: boolean;
}) {
  const content = (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center justify-center lg:justify-start gap-2.5 rounded-medium p-2 lg:px-3 lg:py-2 text-sm font-medium transition-colors motion-reduce:transition-none w-11 h-11 lg:w-full lg:h-auto',
          isActive
            ? 'relative bg-brand-subtle text-brand lg:before:absolute lg:before:start-0 lg:before:top-1 lg:before:h-[calc(100%-8px)] lg:before:w-[3px] lg:before:rounded-e-full lg:before:bg-brand'
            : 'text-default-600 hover:bg-default-100 hover:text-foreground dark:text-default-500 dark:hover:bg-default-50/5 dark:hover:text-foreground',
        ].join(' ')
      }
    >
      <Icon size={15} aria-hidden className="shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );

  if (!isLg) {
    return (
      <Tooltip delay={0} closeDelay={0}>
        <div className="flex justify-center w-full">{content}</div>
        <Tooltip.Content placement="right">{label}</Tooltip.Content>
      </Tooltip>
    );
  }

  return content;
}
