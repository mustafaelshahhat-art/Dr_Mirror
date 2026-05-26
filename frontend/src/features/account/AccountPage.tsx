import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressBookPage } from '../addresses/AddressBookPage';
import { OrdersListPage } from '../orders/OrdersListPage';
import { ReturnsListPage } from '../orders/ReturnsListPage';
import { AccountSecurityPage } from './AccountSecurityPage';
import { AccountPageNav, type AccountTabKey } from './AccountPageNav';
import { AccountProfilePage } from './AccountProfilePage';
import { useAuth } from '../auth/useAuth';

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US', { dateStyle: 'long' }),
    [i18n.language],
  );

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const panels: Record<AccountTabKey, ReactNode> = {
    'personal-data': <AccountProfilePage />,
    orders: <OrdersListPage />,
    returns: <ReturnsListPage />,
    addresses: <AddressBookPage />,
    security: <AccountSecurityPage />,
  };

  return (
    <section className="space-y-8">
      <header className="content-surface flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-base font-bold text-brand">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground">{t('account.account.header.title', { name: user.fullName })}</p>
          <p className="mt-0.5 text-sm text-default-500">{user.email}</p>
          <p className="mt-0.5 text-xs text-default-500">
            {t('account.account.header.memberSince', { date: dateFmt.format(new Date(user.createdAt)) })}
          </p>
        </div>
      </header>

      <AccountPageNav panels={panels} />
    </section>
  );
}
