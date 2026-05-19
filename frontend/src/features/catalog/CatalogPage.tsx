import { Package2, RefreshCw, Ruler, SearchX, Truck } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { CategoryChips } from './components/CategoryChips';
import { FilterPanel } from './components/FilterPanel';
import { ProductCard } from './components/ProductCard';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';
import { SearchInput } from './components/SearchInput';
import { SortSelect } from './components/SortSelect';
import { useCategoriesQuery, useProductsQuery } from './hooks';
import type { ProductFilter, ProductGender, ProductSort } from './types';

const VALID_SORTS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];
const PAGE_SIZE = 24;

/** Trust strip icon+label pairs — neutral retail trust signals for medical apparel. */
const TRUST_ITEMS = [
  { icon: Package2, key: 'fabric' },
  { icon: Ruler,    key: 'sizes' },
  { icon: RefreshCw, key: 'exchange' },
  { icon: Truck,    key: 'delivery' },
] as const;

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
    <div className="space-y-8">
      {/* ── Hero band ───────────────────────────────────────────────────────
          Full-bleed tinted band. Brand color wash provides visual identity
          without heavy illustration; catalog follows immediately. */}
      <section
        className="hero-band hero-band--tinted"
        aria-label={t('catalog.title')}
      >
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand dark:bg-brand/20">
            {t('appName')}
          </span>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('tagline')}
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted md:text-base">
            {t('catalog.subtitle')}
          </p>
        </div>

        {/* Trust strip — inline with hero on md+, below on mobile */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:mt-0 md:ms-auto md:max-w-xs">
          {TRUST_ITEMS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex flex-col items-start gap-1.5 rounded-large border border-brand/20 bg-brand/5 px-3 py-2.5 dark:bg-brand/10"
            >
              <Icon className="size-4 text-brand" aria-hidden />
              <span className="text-xs font-medium leading-tight text-foreground">
                {t(`catalog.trust.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Search / Sort / Category / Filters ─────────────────────────── */}
      <section
        className="flex flex-col gap-4"
        aria-label={t('catalog.filters.label')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput value={filter.q ?? ''} onCommit={setQuery} />
          </div>
          <SortSelect value={filter.sort!} onChange={setSort} />
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

      {/* ── Product listing ─────────────────────────────────────────────── */}
      {isInitialLoad ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <QueryErrorState
          message={t('catalog.errors.loadFailed')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void productsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t('catalog.empty.title')}
          subtitle={t('catalog.empty.subtitle')}
          action={hasActiveFilters ? { label: t('catalog.empty.clearFilters'), onPress: clearAllFilters } : undefined}
        />
      ) : (
        /* eslint-disable-next-line i18next/no-literal-string -- aria-label is set dynamically below */
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          aria-busy={productsQuery.isFetching}
          aria-label={t('catalog.list.productListingLabel')}
        >
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {productsQuery.data ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-default-500 tabular-nums">
            {t('catalog.pagination.results', { count: productsQuery.data.totalCount })}
          </p>
          <PaginationControls
            page={productsQuery.data.page}
            totalPages={productsQuery.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
