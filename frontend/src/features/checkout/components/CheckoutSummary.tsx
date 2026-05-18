import { useTranslation } from 'react-i18next';

import type { CartItemDto } from '../../cart/types';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';

interface Props {
  items: CartItemDto[];
  subTotal: number;
  lang: AppLang;
}

export function CheckoutSummary({ items, subTotal, lang }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.summary.heading')}
      </h2>
      <ul className="space-y-2 text-sm">
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
      <dl className="space-y-1 border-t border-divider/60 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-default-500">{t('checkout.summary.subTotal')}</dt>
          <dd className="tabular-nums">{formatCurrency(subTotal, lang)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-default-500">{t('checkout.summary.shipping')}</dt>
          <dd className="tabular-nums">{t('checkout.summary.shippingFreeM3')}</dd>
        </div>
        <div className="mt-2 flex justify-between border-t border-divider/60 pt-2 text-base font-semibold">
          <dt>{t('checkout.summary.total')}</dt>
          <dd className="tabular-nums">{formatCurrency(subTotal, lang)}</dd>
        </div>
      </dl>
    </aside>
  );
}
