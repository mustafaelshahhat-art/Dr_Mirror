import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import type { PagedResult } from '../../shared/types/paged-result';
import { ordersApi } from './api';
import type {
  AppConfigDto,
  PaymentProofUploadConfigDto,
} from '../app-config/types';
import type {
  CancelOrderRequest,
  CreateOrderRequest,
  OrderDetailDto,
  OrderSummaryDto,
  PaymentMethodDto,
} from './types';

/**
 * Whole app-config query — payment-proof upload limits AND the optional
 * support contact email. Cached for 10 minutes since the values are runtime
 * config that rarely changes mid-session.
 */
export function useAppConfigQuery() {
  return useQuery<AppConfigDto>({
    queryKey: queryKeys.appConfig(),
    queryFn: () => ordersApi.getAppConfig(),
    staleTime: 10 * 60_000,
  });
}

export function usePaymentProofUploadConfigQuery() {
  return useQuery<AppConfigDto, Error, PaymentProofUploadConfigDto>({
    queryKey: queryKeys.appConfig(),
    queryFn: () => ordersApi.getAppConfig(),
    staleTime: 10 * 60_000,
    select: (data) => data.paymentProofUpload,
  });
}

export function usePaymentMethodsQuery() {
  return useQuery<PaymentMethodDto[]>({
    queryKey: queryKeys.paymentMethods(),
    queryFn: () => ordersApi.getPaymentMethods(),
    staleTime: 5 * 60_000,
  });
}

export function useMyOrdersQuery(page = 1, pageSize = 20) {
  return useQuery<PagedResult<OrderSummaryDto>>({
    queryKey: queryKeys.orders.list(page, pageSize),
    queryFn: () => ordersApi.listMyOrders({ page, pageSize }),
    staleTime: 30_000,
  });
}

export function useMyOrderQuery(orderNumber: string | undefined) {
  return useQuery<OrderDetailDto>({
    queryKey: queryKeys.orders.detail(orderNumber ?? ''),
    queryFn: () => ordersApi.getMyOrder(orderNumber!),
    enabled: Boolean(orderNumber),
    staleTime: 15_000,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<OrderDetailDto, Error, { input: CreateOrderRequest; idempotencyKey?: string }>({
    mutationFn: ({ input, idempotencyKey }) => ordersApi.createOrder(input, idempotencyKey),
    onSuccess: (order) => {
      // Checkout consumes the cart — invalidate so the mini-cart updates.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      // Seed the detail query so the post-checkout redirect renders instantly.
      queryClient.setQueryData(queryKeys.orders.detail(order.orderNumber), order);
      // Bust any cached lists so the new order appears in /account/orders.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}

export function useCancelOrderMutation(orderNumber: string) {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<OrderDetailDto, Error, CancelOrderRequest>({
    mutationFn: (input) => ordersApi.cancelMyOrder(orderNumber, input),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}

export function useUploadPaymentProofMutation(orderNumber: string) {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<OrderDetailDto, Error, File>({
    mutationFn: (file) => ordersApi.uploadPaymentProof(orderNumber, file),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}
