import { Spinner } from '@heroui/react';
import { Package, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SearchInput } from '../../catalog/components/SearchInput';
import { genderTranslationKey } from '../../catalog/hooks';
import type { ProductGender } from '../../catalog/types';

import { useAdminCategoriesQuery, useAdminProductsQuery } from './hooks';

import { PaginationControls } from '../../../shared/components/PaginationControls';
import { SelectField } from '../../../shared/components/SelectField';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { QueryErrorState } from '../components/QueryErrorState';

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
          className="inline-flex items-center gap-1.5 rounded-medium bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          {t('admin.products.list.new')}
        </Link>
      </header>

      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_10rem_10rem]">
        <SearchInput
          value={q}
          onCommit={(val) => { setQ(val); setPage(1); }}
        />
        <SelectField
          label={t('admin.products.fields.category')}
          hideLabel
          value={categoryId ?? ''}
          emptyLabel={t('admin.products.list.allCategories')}
          onChange={(next) => { setCategoryId(next || undefined); setPage(1); }}
          options={(categories.data ?? []).map((c) => ({
            value: c.id,
            label: isAr ? c.nameAr : c.nameEn,
          }))}
        />
        <SelectField
          label={t('admin.products.fields.gender')}
          hideLabel
          value={gender === undefined ? '' : String(gender)}
          emptyLabel={t('admin.products.list.allGenders')}
          onChange={(next) => {
            setGender(next === '' ? undefined : (Number(next) as ProductGender));
            setPage(1);
          }}
          options={[0, 1, 2].map((next) => ({
            value: String(next),
            label: t(genderTranslationKey(next as ProductGender)),
          }))}
        />
        <SelectField
          label={t('admin.list.status')}
          hideLabel
          value={published === undefined ? '' : published ? 'pub' : 'draft'}
          emptyLabel={t('admin.products.list.allStatuses')}
          onChange={(next) => {
            setPublished(next === '' ? undefined : next === 'pub');
            setPage(1);
          }}
          options={[
            { value: 'pub', label: t('admin.products.list.published') },
            { value: 'draft', label: t('admin.products.list.draft') },
          ]}
        />
      </div>

      {products.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner aria-label={t('admin.products.list.loading')} />
        </div>
      ) : products.isError ? (
        <QueryErrorState
          message={t('admin.products.list.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void products.refetch()}
        />
      ) : (products.data?.items ?? []).length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Package className="mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="text-sm text-default-500">{t('admin.products.list.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-large border border-divider/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-content2">
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.products.fields.nameEn')}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400 md:table-cell">
                    {t('admin.products.fields.category')}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400 lg:table-cell">
                    {t('admin.products.fields.gender')}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400 sm:table-cell">
                    {t('admin.products.variants.stockLabel')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.list.status')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.products.fields.price')}
                  </th>
                  <th scope="col" className="w-12 px-4 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {(products.data?.items ?? []).map((p) => (
                  <tr key={p.id} className="bg-content1 transition-colors hover:bg-content2">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{isAr ? p.nameAr : p.nameEn}</p>
                      <p className="text-xs text-default-500" dir="ltr">/{p.slug}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-default-500 md:table-cell">
                      {isAr ? p.categoryNameAr : p.categoryNameEn}
                    </td>
                    <td className="hidden px-4 py-3 text-default-500 lg:table-cell">
                      {t(genderTranslationKey(p.gender))}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-default-500 sm:table-cell">
                      {t('admin.products.list.totalStock', { count: p.totalStock })}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums font-medium">
                      {formatCurrency(p.price, lang)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        aria-label={t('admin.catalog.actions.edit')}
                        className="inline-flex size-8 items-center justify-center rounded-medium text-default-500 transition-colors hover:bg-content2 hover:text-foreground"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
