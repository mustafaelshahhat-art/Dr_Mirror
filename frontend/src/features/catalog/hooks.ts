import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '../../shared/lib/query-keys';
import { catalogApi } from './api';
import type {
  ProductDetailDto,
  ProductFilter,
  ProductGender,
  ProductVariantDto,
} from './types';

const CATALOG_STALE = 60_000;
const CATALOG_GC = 5 * 60_000;

/**
 * Categories rarely change at runtime, so we cache them aggressively.
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => catalogApi.listCategories(signal),
    staleTime: CATALOG_STALE,
    gcTime: CATALOG_GC,
  });
}

/**
 * Paginated, filterable product list. We pass `keepPreviousData` so the grid
 * doesn't blank out while the next page loads — much smoother UX.
 */
export function useProductsQuery(filter: ProductFilter) {
  return useQuery({
    queryKey: queryKeys.catalog.list(filter),
    queryFn: ({ signal }) => catalogApi.listProducts(filter, signal),
    placeholderData: keepPreviousData,
    staleTime: CATALOG_STALE,
    gcTime: CATALOG_GC,
  });
}

export function useProductDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalog.detail(slug ?? ''),
    queryFn: ({ signal }) => catalogApi.getBySlug(slug!, signal),
    enabled: Boolean(slug),
    staleTime: CATALOG_STALE,
    gcTime: CATALOG_GC,
    retry: (failureCount, error) => {
      // Don't retry on 404 — the slug is wrong, not the network.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

// -----------------------------------------------------------------------------
// Locale-aware field pickers
// -----------------------------------------------------------------------------

/**
 * Returns either NameAr or NameEn depending on the active i18n language, with
 * a graceful fallback if one side is empty in the data.
 */
export function useLocalizedField<T extends { nameAr: string; nameEn: string }>(
  entity: T | undefined,
): string {
  const { i18n } = useTranslation();
  if (!entity) return '';
  return i18n.language?.startsWith('ar')
    ? entity.nameAr || entity.nameEn
    : entity.nameEn || entity.nameAr;
}

export function useLocalizedDescription<T extends { descriptionAr: string; descriptionEn: string }>(
  entity: T | undefined,
): string {
  const { i18n } = useTranslation();
  if (!entity) return '';
  return i18n.language?.startsWith('ar')
    ? entity.descriptionAr || entity.descriptionEn
    : entity.descriptionEn || entity.descriptionAr;
}

/**
 * Map the numeric gender enum to a translation key for label rendering.
 * Returns the unisex key for unexpected values — defensive default that
 * never shows a debug literal in the UI.
 */
export function genderTranslationKey(gender: ProductGender): string {
  switch (gender) {
    case 0: return 'catalog.gender.men';
    case 1: return 'catalog.gender.women';
    case 2: return 'catalog.gender.unisex';
    default: return 'catalog.gender.unisex';
  }
}

// -----------------------------------------------------------------------------
// Variant selection helper for the detail page
// -----------------------------------------------------------------------------

/**
 * Stateful selector over the variant matrix of a product. Picks a sensible
 * default (first in-stock variant), exposes setters for color and size, and
 * derives the "currently selected" variant for stock / SKU display.
 *
 * Returns an empty selection if the product has no active variants — the
 * detail page can fall back to "out of stock" copy in that case.
 */
export function useVariantSelection(product: ProductDetailDto | undefined) {
  const variants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.isActive),
    [product],
  );

  // Default selection: prefer the first in-stock variant; fall back to the
  // first inactive-but-listed variant; null if there are none.
  const initial = useMemo<ProductVariantDto | null>(() => {
    if (variants.length === 0) return null;
    return variants.find((v) => v.stock > 0) ?? variants[0];
  }, [variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    initial?.colorName ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    initial?.size ?? null,
  );

  const colors = useMemo(() => {
    const seen = new Map<string, ProductVariantDto>();
    for (const v of variants) {
      if (!seen.has(v.colorName)) seen.set(v.colorName, v);
    }
    return Array.from(seen.values());
  }, [variants]);

  // Sizes scoped to the currently-picked colour. Stable order: numeric first
  // (footwear), then letter sizes by canonical apparel order.
  const sizes = useMemo(() => {
    const filtered = selectedColor
      ? variants.filter((v) => v.colorName === selectedColor)
      : variants;
    const unique = Array.from(new Set(filtered.map((v) => v.size)));
    return unique.sort(compareSize);
  }, [variants, selectedColor]);

  const selectedVariant = useMemo<ProductVariantDto | null>(() => {
    if (!selectedColor || !selectedSize) return null;
    return (
      variants.find(
        (v) => v.colorName === selectedColor && v.size === selectedSize,
      ) ?? null
    );
  }, [variants, selectedColor, selectedSize]);

  const pickColor = (color: string) => {
    setSelectedColor(color);
    // Keep size if still available for the new colour, otherwise drop to the
    // first available size for that colour.
    const match = variants.find(
      (v) => v.colorName === color && v.size === selectedSize,
    );
    if (!match) {
      const fallback = variants.find(
        (v) => v.colorName === color && v.stock > 0,
      );
      setSelectedSize(fallback?.size ?? null);
    }
  };

  return {
    variants,
    colors,
    sizes,
    selectedColor,
    selectedSize,
    selectedVariant,
    setColor: pickColor,
    setSize: setSelectedSize,
  };
}

const APPAREL_ORDER: Record<string, number> = {
  XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, XXXL: 6, OS: 100,
};

function compareSize(a: string, b: string): number {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  const orderA = APPAREL_ORDER[a] ?? 99;
  const orderB = APPAREL_ORDER[b] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b);
}
