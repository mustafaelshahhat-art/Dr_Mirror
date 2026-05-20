import { Banknote, MapPin, RefreshCw, SearchX, Smartphone } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { CategorySelect } from './components/CategorySelect';
import { ProductCard } from './components/ProductCard';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';
import { SearchInput } from './components/SearchInput';
import { SortSelect } from './components/SortSelect';
import { useCategoriesQuery, useProductsQuery } from './hooks';
import type { ProductFilter, ProductGender, ProductSort } from './types';

const VALID_SORTS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];
const PAGE_SIZE = 24;

/** Trust strip items — uses common.trust.* keys. */
const TRUST_ITEMS = [
  { icon: Banknote,   key: 'cod' },
  { icon: Smartphone, key: 'instapay' },
  { icon: MapPin,     key: 'governorates' },
  { icon: RefreshCw,  key: 'returns' },
] as const;

export function CatalogPage() {
  const { t, i18n } = useTranslation();
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
        aria-label={t('catalog.hero.title')}
      >
        <div className="w-full space-y-4">
          <PageHeader
            eyebrow={t('catalog.hero.eyebrow')}
            title={t('catalog.hero.title')}
            subtitle={t('catalog.hero.subtitle')}
            className={i18n.language === 'ar' ? '[&_.page-title]:text-balance' : undefined}
          />
          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {TRUST_ITEMS.map(({ icon: Icon, key }) => (
              <span key={key} className="flex items-center gap-2 text-sm leading-relaxed text-default-500 sm:text-base">
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(`common.trust.${key}`)}
              </span>
            ))}
          </div>
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
          {categoriesQuery.data ? (
            <CategorySelect
              categories={categoriesQuery.data}
              selectedId={filter.categoryId}
              onSelect={setCategoryId}
            />
          ) : null}
          <SortSelect value={filter.sort!} onChange={setSort} />
        </div>
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
