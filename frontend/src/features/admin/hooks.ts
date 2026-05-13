import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderDetailDto, OrderStatus, OrderSummaryDto } from '../orders/types';

import { adminOrdersApi } from './api';

const KEYS = {
  list: (status: OrderStatus | undefined, page: number, pageSize: number) =>
    ['admin', 'orders', 'list', { status, page, pageSize }] as const,
  detail: (orderNumber: string) =>
    ['admin', 'orders', 'detail', orderNumber] as const,
};

export function useAdminOrdersQuery(args: {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}) {
  const { status, page = 1, pageSize = 25 } = args;
  return useQuery<OrderSummaryDto[]>({
    queryKey: KEYS.list(status, page, pageSize),
    queryFn: () => adminOrdersApi.list({ status, page, pageSize }),
    staleTime: 15_000,
  });
}

export function useAdminOrderQuery(orderNumber: string | undefined) {
  return useQuery<OrderDetailDto>({
    queryKey: KEYS.detail(orderNumber ?? ''),
    queryFn: () => adminOrdersApi.get(orderNumber!),
    enabled: Boolean(orderNumber),
    staleTime: 10_000,
  });
}

interface MutationCommonArgs {
  orderNumber: string;
}

export function useAdminTransitionMutation({ orderNumber }: MutationCommonArgs) {
  const queryClient = useQueryClient();
  return useMutation<
    OrderDetailDto,
    Error,
    { toStatus: OrderStatus; reason?: string | null }
  >({
    mutationFn: (input) => adminOrdersApi.transition(orderNumber, input),
    onSuccess: (order) => {
      queryClient.setQueryData(KEYS.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'list'], exact: false });
    },
  });
}

export function useApproveProofMutation({ orderNumber }: MutationCommonArgs) {
  const queryClient = useQueryClient();
  return useMutation<
    OrderDetailDto,
    Error,
    { proofId: string; reviewNote?: string | null }
  >({
    mutationFn: ({ proofId, reviewNote }) =>
      adminOrdersApi.approveProof(orderNumber, proofId, { reviewNote }),
    onSuccess: (order) => {
      queryClient.setQueryData(KEYS.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'list'], exact: false });
    },
  });
}

export function useRejectProofMutation({ orderNumber }: MutationCommonArgs) {
  const queryClient = useQueryClient();
  return useMutation<
    OrderDetailDto,
    Error,
    { proofId: string; reviewNote: string }
  >({
    mutationFn: ({ proofId, reviewNote }) =>
      adminOrdersApi.rejectProof(orderNumber, proofId, { reviewNote }),
    onSuccess: (order) => {
      queryClient.setQueryData(KEYS.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'list'], exact: false });
    },
  });
}
