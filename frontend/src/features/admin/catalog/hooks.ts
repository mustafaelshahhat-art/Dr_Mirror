import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PagedResult } from '../../../shared/types/paged-result';
import { adminCatalogApi } from './api';
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
  AdminProductVariantDto,
  AdminProductsListParams,
  AdminVariantUpsertRequest,
} from './types';

const KEYS = {
  categories: () => ['admin', 'categories'] as const,
  products: (params: AdminProductsListParams) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'products', 'detail', id] as const,
  paymentMethods: () => ['admin', 'payment-methods'] as const,
};

// ----- Categories ------------------------------------------------------------

export function useAdminCategoriesQuery() {
  return useQuery<AdminCategoryDto[]>({
    queryKey: KEYS.categories(),
    queryFn: () => adminCatalogApi.listCategories(),
    staleTime: 30_000,
  });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryDto, Error, AdminCategoryUpsertRequest>({
    mutationFn: (body) => adminCatalogApi.createCategory(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.categories() }),
  });
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryDto, Error, { id: string; body: AdminCategoryUpsertRequest }>(
    {
      mutationFn: ({ id, body }) => adminCatalogApi.updateCategory(id, body),
      onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.categories() }),
    },
  );
}

export function useToggleCategoryActiveMutation() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryDto, Error, { id: string; activate: boolean }>({
    mutationFn: ({ id, activate }) =>
      activate
        ? adminCatalogApi.activateCategory(id)
        : adminCatalogApi.deactivateCategory(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.categories() }),
  });
}

// ----- Products --------------------------------------------------------------

export function useAdminProductsQuery(params: AdminProductsListParams = {}) {
  return useQuery<PagedResult<AdminProductSummaryDto>>({
    queryKey: KEYS.products(params),
    queryFn: () => adminCatalogApi.listProducts(params),
    staleTime: 15_000,
  });
}

export function useAdminProductQuery(id: string | undefined) {
  return useQuery<AdminProductDetailDto>({
    queryKey: KEYS.product(id ?? ''),
    queryFn: () => adminCatalogApi.getProduct(id!),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useCreateProductMutation() {
  const qc = useQueryClient();
  return useMutation<AdminProductDetailDto, Error, AdminProductCreateRequest>({
    mutationFn: (body) => adminCatalogApi.createProduct(body),
    onSuccess: (product) => {
      qc.setQueryData(KEYS.product(product.id), product);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'], exact: false });
    },
  });
}

export function useUpdateProductMutation() {
  const qc = useQueryClient();
  return useMutation<
    AdminProductDetailDto,
    Error,
    { id: string; body: AdminProductUpdateRequest }
  >({
    mutationFn: ({ id, body }) => adminCatalogApi.updateProduct(id, body),
    onSuccess: (product) => {
      qc.setQueryData(KEYS.product(product.id), product);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'], exact: false });
    },
  });
}

export function useTogglePublishMutation() {
  const qc = useQueryClient();
  return useMutation<AdminProductDetailDto, Error, { id: string; publish: boolean }>({
    mutationFn: ({ id, publish }) =>
      publish ? adminCatalogApi.publishProduct(id) : adminCatalogApi.unpublishProduct(id),
    onSuccess: (product) => {
      qc.setQueryData(KEYS.product(product.id), product);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'], exact: false });
    },
  });
}

// ----- Variants --------------------------------------------------------------

export function useCreateVariantMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<AdminProductVariantDto, Error, AdminVariantUpsertRequest>({
    mutationFn: (body) => adminCatalogApi.createVariant(productId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

export function useUpdateVariantMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<
    AdminProductVariantDto,
    Error,
    { variantId: string; body: AdminVariantUpsertRequest }
  >({
    mutationFn: ({ variantId, body }) =>
      adminCatalogApi.updateVariant(productId, variantId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

export function useToggleVariantActiveMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<
    AdminProductVariantDto,
    Error,
    { variantId: string; activate: boolean }
  >({
    mutationFn: ({ variantId, activate }) =>
      activate
        ? adminCatalogApi.activateVariant(productId, variantId)
        : adminCatalogApi.deactivateVariant(productId, variantId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

// ----- Images ----------------------------------------------------------------

export function useUploadImageMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<AdminProductImageDto, Error, File>({
    mutationFn: (file) => adminCatalogApi.uploadImage(productId, file),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

export function useUpdateImageMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<
    AdminProductImageDto,
    Error,
    { imageId: string; body: AdminProductImageUpdateRequest }
  >({
    mutationFn: ({ imageId, body }) =>
      adminCatalogApi.updateImage(productId, imageId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

export function useDeleteImageMutation(productId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (imageId) => adminCatalogApi.deleteImage(productId, imageId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.product(productId) }),
  });
}

// ----- Payment methods -------------------------------------------------------

export function useAdminPaymentMethodsQuery() {
  return useQuery<AdminPaymentMethodDto[]>({
    queryKey: KEYS.paymentMethods(),
    queryFn: () => adminCatalogApi.listPaymentMethods(),
    staleTime: 30_000,
  });
}

export function useCreatePaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation<AdminPaymentMethodDto, Error, AdminPaymentMethodCreateRequest>({
    mutationFn: (body) => adminCatalogApi.createPaymentMethod(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.paymentMethods() });
      // The buyer-facing /checkout/payment-methods list also needs to refresh
      // so a freshly-added method appears without a manual reload.
      void qc.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}

export function useUpdatePaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation<
    AdminPaymentMethodDto,
    Error,
    { id: string; body: AdminPaymentMethodUpdateRequest }
  >({
    mutationFn: ({ id, body }) => adminCatalogApi.updatePaymentMethod(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.paymentMethods() });
      void qc.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}

export function useTogglePaymentMethodActiveMutation() {
  const qc = useQueryClient();
  return useMutation<AdminPaymentMethodDto, Error, { id: string; activate: boolean }>({
    mutationFn: ({ id, activate }) =>
      activate
        ? adminCatalogApi.activatePaymentMethod(id)
        : adminCatalogApi.deactivatePaymentMethod(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.paymentMethods() });
      void qc.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}
