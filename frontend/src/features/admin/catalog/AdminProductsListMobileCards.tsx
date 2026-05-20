/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';

import { genderTranslationKey } from '../../catalog/hooks';

import type { AdminProductSummaryDto } from './types';

interface AdminProductsListMobileCardsProps {
  products: AdminProductSummaryDto[];
  lang: AppLang;
}

export function AdminProductsListMobileCards({ products, lang }: AdminProductsListMobileCardsProps) {
  const { t } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <ul role="list" className="space-y-3">
      {products.map((p) => (
        <li role="listitem" key={p.id}>
          <Link to={`/admin/products/${p.id}/edit`}>
            <Card className="p-4 transition-colors hover:bg-content2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium text-foreground">
                    {isAr ? p.nameAr : p.nameEn}
                  </p>
                  <p className="text-xs text-default-500">
                    {isAr ? p.categoryNameAr : p.categoryNameEn}
                    <span className="mx-1">·</span>
                    {t(genderTranslationKey(p.gender))}
                  </p>
                  <p className="text-xs text-default-500">
                    {t('admin.products.list.totalStock', { count: p.totalStock })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={[
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                      p.isPublished
                        ? 'border-success/30 bg-success/15 text-success'
                        : 'border-warning/30 bg-warning/15 text-warning',
                    ].join(' ')}
                  >
                    {p.isPublished ? t('admin.products.list.published') : t('admin.products.list.draft')}
                  </span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatCurrency(p.price, lang)}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
