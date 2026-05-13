import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from './api';
import type {
  CancelOrderRequest,
  CreateOrderRequest,
  OrderDetailDto,
  OrderSummaryDto,
  PaymentMethodDto,
} from './types';

const KEYS = {
  paymentMethods: () => ['payment-methods'] as const,
  myOrders: (page: number, pageSize: number) =>
    ['orders', 'mine', { page, pageSize }] as const,
  myOrder: (orderNumber: string) => ['orders', 'mine', orderNumber] as const,
};

export function usePaymentMethodsQuery() {
  return useQuery<PaymentMethodDto[]>({
    queryKey: KEYS.paymentMethods(),
    queryFn: () => ordersApi.getPaymentMethods(),
    staleTime: 5 * 60_000,
  });
}

export function useMyOrdersQuery(page = 1, pageSize = 20) {
  return useQuery<OrderSummaryDto[]>({
    queryKey: KEYS.myOrders(page, pageSize),
    queryFn: () => ordersApi.listMyOrders({ page, pageSize }),
    staleTime: 30_000,
  });
}

export function useMyOrderQuery(orderNumber: string | undefined) {
  return useQuery<OrderDetailDto>({
    queryKey: KEYS.myOrder(orderNumber ?? ''),
    queryFn: () => ordersApi.getMyOrder(orderNumber!),
    enabled: Boolean(orderNumber),
    staleTime: 15_000,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation<OrderDetailDto, Error, CreateOrderRequest>({
    mutationFn: (input) => ordersApi.createOrder(input),
    onSuccess: (order) => {
      // Checkout consumes the cart — invalidate so the mini-cart updates.
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Seed the detail query so the post-checkout redirect renders instantly.
      queryClient.setQueryData(KEYS.myOrder(order.orderNumber), order);
      // Bust any cached lists so the new order appears in /account/orders.
      void queryClient.invalidateQueries({ queryKey: ['orders', 'mine'], exact: false });
    },
  });
}

export function useCancelOrderMutation(orderNumber: string) {
  const queryClient = useQueryClient();
  return useMutation<OrderDetailDto, Error, CancelOrderRequest>({
    mutationFn: (input) => ordersApi.cancelMyOrder(orderNumber, input),
    onSuccess: (order) => {
      queryClient.setQueryData(KEYS.myOrder(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'mine'], exact: false });
    },
  });
}

export function useUploadPaymentProofMutation(orderNumber: string) {
  const queryClient = useQueryClient();
  return useMutation<OrderDetailDto, Error, File>({
    mutationFn: (file) => ordersApi.uploadPaymentProof(orderNumber, file),
    onSuccess: (order) => {
      queryClient.setQueryData(KEYS.myOrder(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'mine'], exact: false });
    },
  });
}
