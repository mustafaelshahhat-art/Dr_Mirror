import { Drawer } from '@heroui/react';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

  return (
    <>
      <div className="hidden w-60 flex-col border-e border-border/50 bg-surface md:flex">
        {/* Sidebar header — BrandMark + product name */}
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3.5">
          <BrandMark size={20} title="Dr Mirror" />
          <span className="text-sm font-bold tracking-tight">{t('appName')}</span>
        </div>
        <SidebarNav label={t('admin.shell.navTitle')} onClose={onClose} />
        {/* Identity footer */}
        {user && (
          <div className="border-t border-border/40 px-3 py-3">
            <div className="flex items-center gap-2.5">
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
                <SidebarNav label={t('admin.shell.navTitleMobile')} onClose={onClose} />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}

function SidebarNav({ label, onClose }: { label: string; onClose?: () => void }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={label} className="flex flex-1 flex-col overflow-y-auto px-2 pb-4 pt-2">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.groupKey}>
          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-default-500">
            {t(`admin.shell.nav.groups.${group.groupKey}`)}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ to, icon: Icon, labelKey, end }) => (
              <NavItem key={to} to={to} icon={Icon} label={t(labelKey)} end={end} onClick={onClose} />
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
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 rounded-medium px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none',
          isActive
            ? 'relative bg-brand-subtle text-brand before:absolute before:start-0 before:top-1 before:h-[calc(100%-8px)] before:w-[3px] before:rounded-e-full before:bg-brand'
            : 'text-default-600 hover:bg-default-100 hover:text-foreground dark:text-default-500 dark:hover:bg-default-50/5 dark:hover:text-foreground',
        ].join(' ')
      }
    >
      <Icon size={15} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}
