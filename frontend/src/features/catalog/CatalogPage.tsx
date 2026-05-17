import { Button } from '@heroui/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { CategoryChips } from './components/CategoryChips';
import { FilterPanel } from './components/FilterPanel';
import { PaginationBar } from './components/PaginationBar';
import { ProductCard } from './components/ProductCard';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';
import { SearchInput } from './components/SearchInput';
import { SortSelect } from './components/SortSelect';
import { useCategoriesQuery, useProductsQuery } from './hooks';
import type { ProductFilter, ProductGender, ProductSort } from './types';
import { QueryErrorState } from '../../shared/components/QueryErrorState';

const VALID_SORTS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];
const PAGE_SIZE = 24;

export function CatalogPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter: ProductFilter = useMemo(() => {
    const sort = searchParams.get('sort') as ProductSort | null;
    const page = Number(searchParams.get('page') ?? '1');
    const genderParam = searchParams.get('gender');
    const gender =
      genderParam !== null && ['0', '1', '2'].includes(genderParam)
        ? (Number(genderParam) as ProductGender)
        : undefined;
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    return {
      categoryId: searchParams.get('categoryId') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      gender,
      size: searchParams.get('size') ?? undefined,
      color: searchParams.get('color') ?? undefined,
      minPrice: minPriceParam !== null ? Number(minPriceParam) : undefined,
      maxPrice: maxPriceParam !== null ? Number(maxPriceParam) : undefined,
      sort: sort && VALID_SORTS.includes(sort) ? sort : 'Newest',
      page: Number.isFinite(page) && page >= 1 ? page : 1,
      pageSize: PAGE_SIZE,
    };
  }, [searchParams]);

  const categoriesQuery = useCategoriesQuery();
  const productsQuery = useProductsQuery(filter);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
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
  const setGender = useCallback(
    (g: ProductGender | undefined) =>
      updateParams({ gender: g !== undefined ? String(g) : undefined }),
    [updateParams],
  );
  const setSize = useCallback((s: string) => updateParams({ size: s }), [updateParams]);
  const setColor = useCallback((c: string) => updateParams({ color: c }), [updateParams]);
  const setMinPrice = useCallback(
    (v: string) => updateParams({ minPrice: v.trim() || undefined }),
    [updateParams],
  );
  const setMaxPrice = useCallback(
    (v: string) => updateParams({ maxPrice: v.trim() || undefined }),
    [updateParams],
  );
  const clearAdvancedFilters = useCallback(
    () =>
      updateParams({
        gender: undefined,
        size: undefined,
        color: undefined,
        minPrice: undefined,
        maxPrice: undefined,
      }),
    [updateParams],
  );

  const clearAllFilters = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  );

  const isInitialLoad = productsQuery.isLoading && productsQuery.data === undefined;
  const items = productsQuery.data?.items ?? [];
  const hasActiveFilters = Boolean(
    filter.categoryId ||
      filter.q ||
      filter.gender !== undefined ||
      filter.size ||
      filter.color ||
      filter.minPrice !== undefined ||
      filter.maxPrice !== undefined ||
      filter.sort !== 'Newest',
  );

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

        <FilterPanel
          filter={filter}
          onGenderChange={setGender}
          onSizeChange={setSize}
          onColorChange={setColor}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onClearAll={clearAdvancedFilters}
        />
      </section>

      {isInitialLoad ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <QueryErrorState
          message={t('catalog.errors.loadFailed')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void productsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <p className="text-base font-medium text-foreground">{t('catalog.empty.title')}</p>
          <p className="mt-1 text-sm text-default-500">{t('catalog.empty.subtitle')}</p>
          {hasActiveFilters ? (
            <Button variant="primary" size="sm" onPress={clearAllFilters} className="mt-4">
              {t('catalog.empty.clearFilters')}
            </Button>
          ) : null}
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
