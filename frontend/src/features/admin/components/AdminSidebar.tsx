import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Package,
  FolderTree,
  CreditCard,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
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

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          role="presentation"
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 start-0 top-14 z-50 flex w-56 flex-col border-e border-divider/60 bg-content1 transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-end p-2 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-medium p-1 transition-colors hover:bg-default-100"
            aria-label="Close"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4 pt-2">
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavItem key={to} to={to} icon={Icon} label={t(`admin.shell.nav.${key}`)} />
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
}: {
  to: string;
  icon: typeof ClipboardList;
  label: string;
}) {
  return (
    <NavLink
      to={to}
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
