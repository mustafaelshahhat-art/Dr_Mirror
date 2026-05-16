import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  FolderTree,
  CreditCard,
  MessageSquare,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/admin/orders', icon: ClipboardList, key: 'orders' },
  { to: '/admin/products', icon: Package, key: 'products' },
  { to: '/admin/categories', icon: FolderTree, key: 'categories' },
  { to: '/admin/payment-methods', icon: CreditCard, key: 'paymentMethods' },
  { to: '/admin/inquiries', icon: MessageSquare, key: 'inquiries' },
  { to: '/admin/users', icon: Users, key: 'users' },
] as const;

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 top-14 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          role="presentation"
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 start-0 top-14 z-50 flex w-56 flex-col border-e border-divider/60 bg-background transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:bg-content1 md:translate-x-0 md:rtl:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-divider/60 px-3 py-3 md:hidden">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {t('admin.shell.navTitle')}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 pt-2">
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavItem key={to} to={to} icon={Icon} label={t(`admin.shell.nav.${key}`)} onClick={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: typeof ClipboardList;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
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
