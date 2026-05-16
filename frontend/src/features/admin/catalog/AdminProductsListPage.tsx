import { Spinner } from '@heroui/react';
import { Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SearchInput } from '../../catalog/components/SearchInput';
import { genderTranslationKey } from '../../catalog/hooks';
import type { ProductGender } from '../../catalog/types';

import { useAdminCategoriesQuery, useAdminProductsQuery } from './hooks';

import { PaginationControls } from '../../../shared/components/PaginationControls';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';

export function AdminProductsListPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';

  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<ProductGender | undefined>(undefined);
  const [published, setPublished] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const categories = useAdminCategoriesQuery();
  const products = useAdminProductsQuery({ q: q || undefined, categoryId, gender, published, page });

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('admin.products.list.title')}
          </h1>
          <p className="text-sm text-default-500">{t('admin.products.list.subtitle')}</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-medium bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          {t('admin.products.list.new')}
        </Link>
      </header>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <SearchInput
          value={q}
          onCommit={(val) => { setQ(val); setPage(1); }}
        />
        <select
          value={categoryId ?? ''}
          onChange={(e) => { setCategoryId(e.target.value || undefined); setPage(1); }}
          className="rounded-medium border border-divider bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('admin.products.list.allCategories')}</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {isAr ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <select
          value={gender ?? ''}
          onChange={(e) => {
            setGender(e.target.value === '' ? undefined : (Number(e.target.value) as ProductGender));
            setPage(1);
          }}
          className="rounded-medium border border-divider bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('admin.products.list.allGenders')}</option>
          <option value={0}>{t(genderTranslationKey(0))}</option>
          <option value={1}>{t(genderTranslationKey(1))}</option>
          <option value={2}>{t(genderTranslationKey(2))}</option>
        </select>
        <select
          value={published === undefined ? '' : published ? 'pub' : 'draft'}
          onChange={(e) => {
            const v = e.target.value;
            setPublished(v === '' ? undefined : v === 'pub');
            setPage(1);
          }}
          className="rounded-medium border border-divider bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('admin.products.list.allStatuses')}</option>
          <option value="pub">{t('admin.products.list.published')}</option>
          <option value="draft">{t('admin.products.list.draft')}</option>
        </select>
      </div>

      {products.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner aria-label={t('admin.products.list.loading')} />
        </div>
      ) : (products.data?.items ?? []).length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Package className="mx-auto mb-3 size-10 text-default-400" aria-hidden />
          <p className="text-sm text-default-500">{t('admin.products.list.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {(products.data?.items ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  to={`/admin/products/${p.id}/edit`}
                  className="flex items-center justify-between gap-3 rounded-medium border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold">{isAr ? p.nameAr : p.nameEn}</p>
                    <p className="text-xs text-default-500" dir="ltr">
                      /{p.slug}
                    </p>
                    <p className="text-xs text-default-500">
                      {isAr ? p.categoryNameAr : p.categoryNameEn}
                      {' · '}
                      {t(genderTranslationKey(p.gender))}
                      {' · '}
                      {t('admin.products.list.variantCount', { count: p.variantCount })}
                      {' · '}
                      {t('admin.products.list.totalStock', { count: p.totalStock })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                        p.isPublished
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-warning/30 bg-warning/15 text-warning',
                      ].join(' ')}
                    >
                      {p.isPublished
                        ? t('admin.products.list.published')
                        : t('admin.products.list.draft')}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(p.price, lang)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <PaginationControls
            page={page}
            totalPages={products.data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
