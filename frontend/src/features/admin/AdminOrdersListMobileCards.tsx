/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card } from '@heroui/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import type { OrderStatus } from '../orders/types';

interface AdminOrdersListMobileCardsProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    itemCount: number;
    status: OrderStatus;
    total: number;
  }>;
  lang: AppLang;
}

export function AdminOrdersListMobileCards({ orders, lang }: AdminOrdersListMobileCardsProps) {
  const { t } = useTranslation();
  const isAr = lang === 'ar';
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <ul role="list" className="space-y-3">
      {orders.map((order) => (
        <li key={order.id} role="listitem">
          <Link to={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}>
            <Card className="border border-divider/60 transition-colors hover:bg-content2">
              <Card.Content className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {order.orderNumber}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-default-500">
                  <span className="tabular-nums">{dateFmt.format(new Date(order.createdAt))}</span>
                  <span>{t('admin.list.itemCount', { count: order.itemCount })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-default-500">{t('admin.list.total')}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(order.total, lang)}</span>
                </div>
              </Card.Content>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
