import { Table, Tooltip } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { Package, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SearchInput } from '../../catalog/components/SearchInput';
import { genderTranslationKey } from '../../catalog/hooks';
import type { ProductGender } from '../../catalog/types';

import { AdminProductsListMobileCards } from './AdminProductsListMobileCards';
import { useAdminCategoriesQuery, useAdminProductsQuery } from './hooks';

import { PageHeader } from '../../../shared/components/PageHeader';
import { PaginationControls } from '../../../shared/components/PaginationControls';
import { SelectField } from '../../../shared/components/SelectField';
import { TableRowSkeleton, TableSkeletonHeader } from '../../../shared/components/TableRowSkeleton';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { StatusPill } from '../../../shared/components/StatusPill';

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
    <section className="space-y-8">
      <PageHeader
        title={t('admin.products.list.title')}
        subtitle={t('admin.products.list.subtitle')}
        action={
          <Link to="/admin/products/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            <Plus className="size-4" aria-hidden />
            {t('admin.products.list.new')}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_12rem_10rem_10rem]">
        <div className="col-span-2">
          <SearchInput
            value={q}
            onCommit={(val) => { setQ(val); setPage(1); }}
          />
        </div>
        <SelectField
          label={t('admin.products.fields.category')}
          hideLabel
          isFilter
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
          isFilter
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
          isFilter
          // eslint-disable-next-line i18next/no-literal-string -- API enum values, not user copy
          value={published === undefined ? '' : published ? 'pub' : 'draft'}
          emptyLabel={t('admin.products.list.allStatuses')}
          onChange={(next) => {
            setPublished(next === '' ? undefined : next === 'pub');
            setPage(1);
          }}
          options={[
            // eslint-disable-next-line i18next/no-literal-string -- API enum value, not user copy
            { value: 'pub', label: t('admin.products.list.published') },
            // eslint-disable-next-line i18next/no-literal-string -- API enum value, not user copy
            { value: 'draft', label: t('admin.products.list.draft') },
          ]}
        />
      </div>

      {products.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.products.list.loading')} aria-busy={true}>
              <TableSkeletonHeader cols={6} label={t('admin.products.list.loading')} />
              <Table.Body>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : products.isError ? (
        <QueryErrorState
          message={t('admin.products.list.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void products.refetch()}
        />
      ) : (products.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Package} title={t('admin.products.list.empty')} />
      ) : (
        <div className="space-y-4">
          <div className="hidden sm:block">
            <Table className="rounded-large border border-divider/60">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('admin.products.list.title')} aria-busy={products.isFetching}>
                  <Table.Header>
                    <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                      {isAr ? t('admin.products.fields.nameAr') : t('admin.products.fields.nameEn')}
                    </Table.Column>
                    <Table.Column className="hidden px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500 md:table-cell">
                      {t('admin.products.fields.category')}
                    </Table.Column>
                    <Table.Column className="hidden px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500 lg:table-cell">
                      {t('admin.products.fields.gender')}
                    </Table.Column>
                    <Table.Column className="hidden px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500 sm:table-cell">
                      {t('admin.products.variants.stockLabel')}
                    </Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                      {t('admin.list.status')}
                    </Table.Column>
                    <Table.Column className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-default-500">
                      {t('admin.products.fields.price')}
                    </Table.Column>
                    <Table.Column className="w-12 px-4 py-3" aria-label={t('admin.catalog.actions.edit')} />
                  </Table.Header>
                  <Table.Body className="divide-y divide-divider/60">
                    {(products.data?.items ?? []).map((p) => (
                      <Table.Row key={p.id} className="bg-content1 transition-colors hover:bg-content2">
                        <Table.Cell className="px-4 py-3">
                          <p className="font-medium text-foreground">{isAr ? p.nameAr : p.nameEn}</p>
                        </Table.Cell>
                        <Table.Cell className="hidden px-4 py-3 text-default-500 md:table-cell">
                          {isAr ? p.categoryNameAr : p.categoryNameEn}
                        </Table.Cell>
                        <Table.Cell className="hidden px-4 py-3 text-default-500 lg:table-cell">
                          {t(genderTranslationKey(p.gender))}
                        </Table.Cell>
                        <Table.Cell className="hidden px-4 py-3 tabular-nums text-default-500 sm:table-cell">
                          {t('admin.products.list.totalStock', { count: p.totalStock })}
                        </Table.Cell>
                        <Table.Cell className="px-4 py-3">
                          <StatusPill
                            active={p.isPublished}
                            activeLabel={t('admin.products.list.published')}
                            inactiveLabel={t('admin.products.list.draft')}
                          />
                        </Table.Cell>
                        <Table.Cell className="px-4 py-3 text-end tabular-nums font-medium">
                          {formatCurrency(p.price, lang)}
                        </Table.Cell>
                        <Table.Cell className="px-4 py-3 text-end">
                          <Tooltip delay={300} closeDelay={0}>
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              aria-label={t('admin.catalog.actions.edit')}
                              className={`${buttonVariants({ variant: 'outline', size: 'sm', isIconOnly: true })} min-h-11 min-w-11`}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Link>
                            <Tooltip.Content placement="top">
                              {t('admin.catalog.actions.edit')}
                            </Tooltip.Content>
                          </Tooltip>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <div className="sm:hidden">
            <AdminProductsListMobileCards
              products={products.data?.items ?? []}
              lang={lang}
            />
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
