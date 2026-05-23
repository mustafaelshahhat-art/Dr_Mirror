import { api } from '../../../shared/lib/api-client';
import type { PagedResult } from '../../../shared/types/paged-result';

import type {
  AdminCategoryDto,
  AdminCategoryUpsertRequest,
  AdminPaymentMethodCreateRequest,
  AdminPaymentMethodDto,
  AdminPaymentMethodUpdateRequest,
  AdminProductCreateRequest,
  AdminProductDetailDto,
  AdminProductImageDto,
  AdminProductImageUpdateRequest,
  AdminProductSummaryDto,
  AdminProductUpdateRequest,
  AdminProductsListParams,
  AdminProductVariantDto,
  AdminVariantUpsertRequest,
} from './types';

/**
 * Thin axios wrappers around the admin catalog + payment-method slices.
 * Every call hits <c>/api/admin/*</c> and requires the Admin role on the
 * caller's JWT (mirrored by the SPA's <c>AdminRoute</c> gate).
 */
export const adminCatalogApi = {
  // -------- Categories ----------------------------------------------------
  async listCategories(): Promise<AdminCategoryDto[]> {
    const { data } = await api.get<AdminCategoryDto[]>('/admin/categories');
    return data;
  },
  async createCategory(body: AdminCategoryUpsertRequest): Promise<AdminCategoryDto> {
    const { data } = await api.post<AdminCategoryDto>('/admin/categories', body);
    return data;
  },
  async updateCategory(
    id: string,
    body: AdminCategoryUpsertRequest,
  ): Promise<AdminCategoryDto> {
    const { data } = await api.put<AdminCategoryDto>(`/admin/categories/${id}`, body);
    return data;
  },
  async activateCategory(id: string): Promise<AdminCategoryDto> {
    const { data } = await api.post<AdminCategoryDto>(`/admin/categories/${id}/activate`);
    return data;
  },
  async deactivateCategory(id: string): Promise<AdminCategoryDto> {
    const { data } = await api.post<AdminCategoryDto>(
      `/admin/categories/${id}/deactivate`,
    );
    return data;
  },

  // -------- Products ------------------------------------------------------
  async listProducts(params?: AdminProductsListParams): Promise<PagedResult<AdminProductSummaryDto>> {
    const { data } = await api.get<PagedResult<AdminProductSummaryDto>>('/admin/products', { params });
    return data;
  },
  async getProduct(id: string): Promise<AdminProductDetailDto> {
    const { data } = await api.get<AdminProductDetailDto>(`/admin/products/${id}`);
    return data;
  },
  async createProduct(body: AdminProductCreateRequest): Promise<AdminProductDetailDto> {
    const { data } = await api.post<AdminProductDetailDto>('/admin/products', body);
    return data;
  },
  async updateProduct(
    id: string,
    body: AdminProductUpdateRequest,
  ): Promise<AdminProductDetailDto> {
    const { data } = await api.put<AdminProductDetailDto>(`/admin/products/${id}`, body);
    return data;
  },
  async publishProduct(id: string): Promise<AdminProductDetailDto> {
    const { data } = await api.post<AdminProductDetailDto>(`/admin/products/${id}/publish`);
    return data;
  },
  async unpublishProduct(id: string): Promise<AdminProductDetailDto> {
    const { data } = await api.post<AdminProductDetailDto>(
      `/admin/products/${id}/unpublish`,
    );
    return data;
  },

  // -------- Variants ------------------------------------------------------
  async createVariant(
    productId: string,
    body: AdminVariantUpsertRequest,
  ): Promise<AdminProductVariantDto> {
    const { data } = await api.post<AdminProductVariantDto>(
      `/admin/products/${productId}/variants`,
      body,
    );
    return data;
  },
  async updateVariant(
    productId: string,
    variantId: string,
    body: AdminVariantUpsertRequest,
  ): Promise<AdminProductVariantDto> {
    const { data } = await api.put<AdminProductVariantDto>(
      `/admin/products/${productId}/variants/${variantId}`,
      body,
    );
    return data;
  },
  async activateVariant(productId: string, variantId: string): Promise<AdminProductVariantDto> {
    const { data } = await api.post<AdminProductVariantDto>(
      `/admin/products/${productId}/variants/${variantId}/activate`,
    );
    return data;
  },
  async deactivateVariant(
    productId: string,
    variantId: string,
  ): Promise<AdminProductVariantDto> {
    const { data } = await api.post<AdminProductVariantDto>(
      `/admin/products/${productId}/variants/${variantId}/deactivate`,
    );
    return data;
  },

  // -------- Images --------------------------------------------------------
  async uploadImage(productId: string, file: File): Promise<AdminProductImageDto> {
    const form = new FormData();
    form.append('file', file);
    // The shared axios instance defaults to `Content-Type: application/json`,
    // which prevents the FormData branch from emitting a multipart boundary.
    // Clearing it here lets the browser set `multipart/form-data; boundary=…`.
    const { data } = await api.post<AdminProductImageDto>(
      `/admin/products/${productId}/images`,
      form,
      { headers: { 'Content-Type': undefined } },
    );
    return data;
  },
  async updateImage(
    productId: string,
    imageId: string,
    body: AdminProductImageUpdateRequest,
  ): Promise<AdminProductImageDto> {
    const { data } = await api.put<AdminProductImageDto>(
      `/admin/products/${productId}/images/${imageId}`,
      body,
    );
    return data;
  },
  async deleteImage(productId: string, imageId: string): Promise<void> {
    await api.delete(`/admin/products/${productId}/images/${imageId}`);
  },

  // -------- Payment methods ----------------------------------------------
  async listPaymentMethods(): Promise<AdminPaymentMethodDto[]> {
    const { data } = await api.get<AdminPaymentMethodDto[]>('/admin/payment-methods');
    return data;
  },
  async createPaymentMethod(
    body: AdminPaymentMethodCreateRequest,
  ): Promise<AdminPaymentMethodDto> {
    const { data } = await api.post<AdminPaymentMethodDto>('/admin/payment-methods', body);
    return data;
  },
  async updatePaymentMethod(
    id: string,
    body: AdminPaymentMethodUpdateRequest,
  ): Promise<AdminPaymentMethodDto> {
    const { data } = await api.put<AdminPaymentMethodDto>(
      `/admin/payment-methods/${id}`,
      body,
    );
    return data;
  },
  async activatePaymentMethod(id: string): Promise<AdminPaymentMethodDto> {
    const { data } = await api.post<AdminPaymentMethodDto>(
      `/admin/payment-methods/${id}/activate`,
    );
    return data;
  },
  async deactivatePaymentMethod(id: string): Promise<AdminPaymentMethodDto> {
    const { data } = await api.post<AdminPaymentMethodDto>(
      `/admin/payment-methods/${id}/deactivate`,
    );
    return data;
  },
};
