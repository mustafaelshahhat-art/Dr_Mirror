import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { CategoryChips } from './components/CategoryChips';
import { PaginationBar } from './components/PaginationBar';
import { ProductCard } from './components/ProductCard';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';
import { SearchInput } from './components/SearchInput';
import { SortSelect } from './components/SortSelect';
import { useCategoriesQuery, useProductsQuery } from './hooks';
import type { ProductFilter, ProductSort } from './types';

const VALID_SORTS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];
const PAGE_SIZE = 24;

export function CatalogPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // URL → filter object. Keep this single-source-of-truth so reload, share, and
  // back/forward all behave correctly.
  // ---------------------------------------------------------------------------
  const filter: ProductFilter = useMemo(() => {
    const sort = searchParams.get('sort') as ProductSort | null;
    const page = Number(searchParams.get('page') ?? '1');
    return {
      categoryId: searchParams.get('categoryId') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      sort: sort && VALID_SORTS.includes(sort) ? sort : 'Newest',
      page: Number.isFinite(page) && page >= 1 ? page : 1,
      pageSize: PAGE_SIZE,
    };
  }, [searchParams]);

  const categoriesQuery = useCategoriesQuery();
  const productsQuery = useProductsQuery(filter);

  // ---------------------------------------------------------------------------
  // Filter mutators — one helper, atomic URL updates.
  // ---------------------------------------------------------------------------
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          // Mutating filters always resets to page 1 unless the caller said otherwise.
          if (!('page' in updates)) {
            next.delete('page');
          }
          for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === '') {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCategoryId = useCallback(
    (id: string | undefined) => updateParams({ categoryId: id }),
    [updateParams],
  );
  const setQuery = useCallback((q: string) => updateParams({ q }), [updateParams]);
  const setSort = useCallback(
    (sort: ProductSort) => updateParams({ sort: sort === 'Newest' ? undefined : sort }),
    [updateParams],
  );
  const setPage = useCallback(
    (page: number) => updateParams({ page: page <= 1 ? undefined : String(page) }),
    [updateParams],
  );

  const isInitialLoad = productsQuery.isLoading && productsQuery.data === undefined;
  const items = productsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('catalog.title')}</h1>
        <p className="max-w-prose text-sm text-default-500">{t('catalog.subtitle')}</p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput value={filter.q ?? ''} onCommit={setQuery} />
          </div>
          <SortSelect value={filter.sort ?? 'Newest'} onChange={setSort} />
        </div>

        {categoriesQuery.data ? (
          <CategoryChips
            categories={categoriesQuery.data}
            selectedId={filter.categoryId}
            onSelect={setCategoryId}
          />
        ) : null}
      </section>

      {isInitialLoad ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <div className="rounded-large border border-danger/30 bg-danger/10 p-6 text-center text-sm text-danger">
          {t('catalog.errors.loadFailed')}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <p className="text-base font-medium text-foreground">{t('catalog.empty.title')}</p>
          <p className="mt-1 text-sm text-default-500">{t('catalog.empty.subtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {productsQuery.data ? (
        <PaginationBar
          page={productsQuery.data.page}
          totalPages={productsQuery.data.totalPages}
          totalCount={productsQuery.data.totalCount}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
