import { api } from '../../shared/lib/api-client';

import type {
  CategoryDto,
  PagedResult,
  ProductDetailDto,
  ProductFilter,
  ProductSummaryDto,
} from './types';

/**
 * Strip `undefined` / empty / default-zero values so they don't end up in the URL
 * as `?categoryId=&q=` (which the backend would interpret as empty filter values).
 */
function buildQuery(filter: ProductFilter): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (filter.categoryId) out.categoryId = filter.categoryId;
  if (filter.q && filter.q.trim().length > 0) out.q = filter.q.trim();
  if (filter.gender !== undefined) out.gender = filter.gender;
  if (filter.size && filter.size.trim().length > 0) out.size = filter.size.trim();
  if (filter.color && filter.color.trim().length > 0) out.color = filter.color.trim();
  if (filter.minPrice !== undefined) out.minPrice = filter.minPrice;
  if (filter.maxPrice !== undefined) out.maxPrice = filter.maxPrice;
  if (filter.sort) out.sort = filter.sort;
  if (filter.page) out.page = filter.page;
  if (filter.pageSize) out.pageSize = filter.pageSize;
  return out;
}

export const catalogApi = {
  async listCategories(signal?: AbortSignal): Promise<CategoryDto[]> {
    const { data } = await api.get<CategoryDto[]>('/catalog/categories', { signal });
    return data;
  },

  async listProducts(
    filter: ProductFilter,
    signal?: AbortSignal,
  ): Promise<PagedResult<ProductSummaryDto>> {
    const { data } = await api.get<PagedResult<ProductSummaryDto>>('/catalog/products', {
      params: buildQuery(filter),
      signal,
    });
    return data;
  },

  async getBySlug(slug: string, signal?: AbortSignal): Promise<ProductDetailDto> {
    const { data } = await api.get<ProductDetailDto>(
      `/catalog/products/${encodeURIComponent(slug)}`,
      { signal },
    );
    return data;
  },
};
