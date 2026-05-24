import {
  ArchiveRestore,
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  ScrollText,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface AdminNavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  end?: boolean;
}

interface AdminNavGroup {
  groupKey: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    groupKey: 'operations',
    items: [
      { to: '/admin', icon: LayoutDashboard, labelKey: 'admin.shell.nav.dashboard', end: true },
      { to: '/admin/orders', icon: ClipboardList, labelKey: 'admin.shell.nav.orders' },
      { to: '/admin/returns', icon: ArchiveRestore, labelKey: 'admin.shell.nav.returns' },
      { to: '/admin/shipping-fees', icon: Truck, labelKey: 'admin.shell.nav.shippingFees' },
      { to: '/admin/inquiries', icon: MessageSquare, labelKey: 'admin.shell.nav.inquiries' },
      { to: '/admin/audit', icon: ScrollText, labelKey: 'admin.shell.nav.audit' },
    ],
  },
  {
    groupKey: 'catalog',
    items: [
      { to: '/admin/products', icon: Package, labelKey: 'admin.shell.nav.products' },
      { to: '/admin/categories', icon: FolderTree, labelKey: 'admin.shell.nav.categories' },
      { to: '/admin/payment-methods', icon: CreditCard, labelKey: 'admin.shell.nav.paymentMethods' },
    ],
  },
  {
    groupKey: 'people',
    items: [
      { to: '/admin/users', icon: Users, labelKey: 'admin.shell.nav.users' },
    ],
  },
];

const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function getAdminHeaderTitleKeys(pathname: string): string[] {
  if (pathname === '/admin') return ['admin.hub.title'];
  if (pathname === '/admin/products/new') {
    return ['admin.shell.nav.products', 'admin.products.create.title'];
  }
  if (/^\/admin\/products\/[^/]+\/edit$/.test(pathname)) {
    return ['admin.shell.nav.products', 'admin.products.edit.title'];
  }
  if (/^\/admin\/returns\/[^/]+$/.test(pathname)) {
    return ['admin.shell.nav.returns', 'admin.returns.detail.title'];
  }

  const item = ADMIN_NAV_ITEMS.find((navItem) =>
    navItem.end
      ? pathname === navItem.to
      : pathname === navItem.to || pathname.startsWith(`${navItem.to}/`),
  );

  return item ? [item.labelKey] : ['admin.hub.title'];
}
