import { Separator } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import type { CartItemDto } from '../../cart/types';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';

interface Props {
  items: CartItemDto[];
  subTotal: number;
  shippingFee: number;
  lang: AppLang;
}

export function CheckoutSummary({ items, subTotal, shippingFee, lang }: Props) {
  const { t } = useTranslation();
  const total = subTotal + shippingFee;

  return (
    <aside className="h-fit space-y-4 overflow-hidden rounded-2xl border border-separator/60 bg-surface p-5 lg:sticky lg:top-20">
      <h2 className="text-base font-semibold uppercase tracking-wide text-default-700">
        {t('checkout.summary.heading')}
      </h2>
      <ul className="space-y-2.5 text-sm">
        {items.map((line) => {
          const name = lang === 'ar' ? line.nameAr : line.nameEn;
          return (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="line-clamp-2 min-w-0 flex-1">
                {name}{' '}
                <span className="text-xs text-default-500">{t('common.quantityMultiplier', { count: line.quantity })}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(line.lineTotal, lang)}
              </span>
            </li>
          );
        })}
      </ul>
      {/* Separator per Anatomy A.21; maps border-t border-divider purely-visual separator */}
      <Separator />
      <dl className="space-y-1.5 pt-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-strong">{t('checkout.summary.subTotal')}</dt>
          <dd className="tabular-nums">{formatCurrency(subTotal, lang)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-strong">{t('shipping.breakdown.shippingFee')}</dt>
          <dd className="tabular-nums">{formatCurrency(shippingFee, lang)}</dd>
        </div>
      </dl>
      {/* Separator per Anatomy A.21; Separator cannot be a direct child of <dl> (HTML spec) */}
      <Separator />
      <div className="flex justify-between rounded-xl bg-brand/5 p-3 text-base font-semibold dark:bg-brand/10">
        <span>{t('checkout.summary.total')}</span>
        <span className="tabular-nums">{formatCurrency(total, lang)}</span>
      </div>
    </aside>
  );
}
