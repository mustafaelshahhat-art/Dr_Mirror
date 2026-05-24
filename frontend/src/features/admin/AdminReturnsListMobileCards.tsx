/* eslint-disable jsx-a11y/no-redundant-roles --
   Requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card } from '@heroui/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ReturnStatusBadge } from '../orders/components/ReturnStatusBadge';
import type { AppLang } from '../../shared/lib/theme-storage';
import type { AdminReturnRequestDto } from './api';

interface AdminReturnsListMobileCardsProps {
  returns: AdminReturnRequestDto[];
  lang: AppLang;
}

export function AdminReturnsListMobileCards({ returns, lang }: AdminReturnsListMobileCardsProps) {
  const { t } = useTranslation();
  const isAr = lang === 'ar';
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <ul role="list" className="space-y-3">
      {returns.map((item) => (
        <li key={item.id} role="listitem">
          <Link to={`/admin/returns/${encodeURIComponent(item.id)}`}>
            <Card className="border border-divider/60 transition-colors hover:bg-content2">
              <Card.Content className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {item.orderNumber}
                  </span>
                  <ReturnStatusBadge status={item.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-default-500">
                  <span className="tabular-nums">{dateFmt.format(new Date(item.createdAt))}</span>
                  <span className="font-medium text-default-700">{item.buyerFullName}</span>
                </div>
                <div className="text-xs text-default-500 line-clamp-1 mt-1">
                  <span className="font-medium">{t('admin.returns.list.cols.reason')}:</span>{' '}
                  {item.customerReason}
                </div>
              </Card.Content>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
