import { Drawer } from '@heroui/react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

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
  const placement = i18n.dir() === 'rtl' ? 'right' : 'left';

  return (
    <>
      <div className="hidden w-56 flex-col border-e border-divider/60 bg-content1 md:flex">
        <SidebarNav label={t('admin.shell.navTitle')} onClose={onClose} />
      </div>

      <Drawer isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <Drawer.Backdrop
          variant="transparent"
          className={['bg-background/70', ADMIN_HEADER_OFFSET_CLASS, ADMIN_DRAWER_HEIGHT_CLASS].join(' ')}
        >
          <Drawer.Content
            placement={placement}
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
          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-default-400">
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
          'flex items-center gap-2 rounded-medium px-3 py-2 text-sm transition-colors motion-reduce:transition-none',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-default-600 hover:bg-default-100 dark:text-default-400 dark:hover:bg-default-50/5',
        ].join(' ')
      }
    >
      <Icon size={16} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}
