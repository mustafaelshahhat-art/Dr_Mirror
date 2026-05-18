import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../../shared/lib/query-keys';
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

const ADMIN_STALE = 0;

// ----- Categories ------------------------------------------------------------

export function useAdminCategoriesQuery() {
  return useQuery<AdminCategoryDto[]>({
    queryKey: queryKeys.admin.catalog.categories(),
    queryFn: () => adminCatalogApi.listCategories(),
    staleTime: ADMIN_STALE,
  });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminCategoryDto, Error, AdminCategoryUpsertRequest>({
    mutationFn: (body) => adminCatalogApi.createCategory(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.categories() });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminCategoryDto, Error, { id: string; body: AdminCategoryUpsertRequest }>(
    {
      mutationFn: ({ id, body }) => adminCatalogApi.updateCategory(id, body),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.categories() });
        void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
      },
      onError: errorToast,
    },
  );
}

export function useToggleCategoryActiveMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminCategoryDto, Error, { id: string; activate: boolean }>({
    mutationFn: ({ id, activate }) =>
      activate
        ? adminCatalogApi.activateCategory(id)
        : adminCatalogApi.deactivateCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.categories() });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

// ----- Products --------------------------------------------------------------

export function useAdminProductsQuery(params: AdminProductsListParams = {}) {
  return useQuery<PagedResult<AdminProductSummaryDto>>({
    queryKey: queryKeys.admin.catalog.products(params),
    queryFn: () => adminCatalogApi.listProducts(params),
    staleTime: ADMIN_STALE,
  });
}

export function useAdminProductQuery(id: string | undefined) {
  return useQuery<AdminProductDetailDto>({
    queryKey: queryKeys.admin.catalog.product(id ?? ''),
    queryFn: () => adminCatalogApi.getProduct(id!),
    enabled: Boolean(id),
    staleTime: ADMIN_STALE,
  });
}

export function useCreateProductMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminProductDetailDto, Error, AdminProductCreateRequest>({
    mutationFn: (body) => adminCatalogApi.createProduct(body),
    onSuccess: (product) => {
      qc.setQueryData(queryKeys.admin.catalog.product(product.id), product);
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.productsRoot(), exact: false });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useUpdateProductMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    AdminProductDetailDto,
    Error,
    { id: string; body: AdminProductUpdateRequest }
  >({
    mutationFn: ({ id, body }) => adminCatalogApi.updateProduct(id, body),
    onSuccess: (product) => {
      qc.setQueryData(queryKeys.admin.catalog.product(product.id), product);
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.productsRoot(), exact: false });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useTogglePublishMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminProductDetailDto, Error, { id: string; publish: boolean }>({
    mutationFn: ({ id, publish }) =>
      publish ? adminCatalogApi.publishProduct(id) : adminCatalogApi.unpublishProduct(id),
    onSuccess: (product) => {
      qc.setQueryData(queryKeys.admin.catalog.product(product.id), product);
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.productsRoot(), exact: false });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

// ----- Variants --------------------------------------------------------------

export function useCreateVariantMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminProductVariantDto, Error, AdminVariantUpsertRequest>({
    mutationFn: (body) => adminCatalogApi.createVariant(productId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useUpdateVariantMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    AdminProductVariantDto,
    Error,
    { variantId: string; body: AdminVariantUpsertRequest }
  >({
    mutationFn: ({ variantId, body }) =>
      adminCatalogApi.updateVariant(productId, variantId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useToggleVariantActiveMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    AdminProductVariantDto,
    Error,
    { variantId: string; activate: boolean }
  >({
    mutationFn: ({ variantId, activate }) =>
      activate
        ? adminCatalogApi.activateVariant(productId, variantId)
        : adminCatalogApi.deactivateVariant(productId, variantId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

// ----- Images ----------------------------------------------------------------

export function useUploadImageMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminProductImageDto, Error, File>({
    mutationFn: (file) => adminCatalogApi.uploadImage(productId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useUpdateImageMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    AdminProductImageDto,
    Error,
    { imageId: string; body: AdminProductImageUpdateRequest }
  >({
    mutationFn: ({ imageId, body }) =>
      adminCatalogApi.updateImage(productId, imageId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

export function useDeleteImageMutation(productId: string) {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<void, Error, string>({
    mutationFn: (imageId) => adminCatalogApi.deleteImage(productId, imageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.root() });
    },
    onError: errorToast,
  });
}

// ----- Payment methods -------------------------------------------------------

export function useAdminPaymentMethodsQuery() {
  return useQuery<AdminPaymentMethodDto[]>({
    queryKey: queryKeys.admin.catalog.paymentMethods(),
    queryFn: () => adminCatalogApi.listPaymentMethods(),
    staleTime: ADMIN_STALE,
  });
}

export function useCreatePaymentMethodMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminPaymentMethodDto, Error, AdminPaymentMethodCreateRequest>({
    mutationFn: (body) => adminCatalogApi.createPaymentMethod(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.paymentMethods() });
      // The buyer-facing /checkout/payment-methods list also needs to refresh
      // so a freshly-added method appears without a manual reload.
      void qc.invalidateQueries({ queryKey: queryKeys.paymentMethods() });
    },
    onError: errorToast,
  });
}

export function useUpdatePaymentMethodMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    AdminPaymentMethodDto,
    Error,
    { id: string; body: AdminPaymentMethodUpdateRequest }
  >({
    mutationFn: ({ id, body }) => adminCatalogApi.updatePaymentMethod(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.paymentMethods() });
      void qc.invalidateQueries({ queryKey: queryKeys.paymentMethods() });
    },
    onError: errorToast,
  });
}

export function useTogglePaymentMethodActiveMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<AdminPaymentMethodDto, Error, { id: string; activate: boolean }>({
    mutationFn: ({ id, activate }) =>
      activate
        ? adminCatalogApi.activatePaymentMethod(id)
        : adminCatalogApi.deactivatePaymentMethod(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.catalog.paymentMethods() });
      void qc.invalidateQueries({ queryKey: queryKeys.paymentMethods() });
    },
    onError: errorToast,
  });
}
