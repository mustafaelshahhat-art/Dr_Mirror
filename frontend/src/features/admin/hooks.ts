import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import type { PagedResult } from '../../shared/types/paged-result';
import type { OrderDetailDto, OrderStatus, OrderSummaryDto } from '../orders/types';

import { adminOrdersApi } from './api';

export function useAdminOrdersQuery(args: {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}) {
  const { status, page = 1, pageSize = 25 } = args;
  return useQuery<PagedResult<OrderSummaryDto>>({
    queryKey: queryKeys.admin.orders.list(status, page, pageSize),
    queryFn: () => adminOrdersApi.list({ status, page, pageSize }),
    staleTime: 15_000,
  });
}

export function useAdminOrderQuery(orderNumber: string | undefined) {
  return useQuery<OrderDetailDto>({
    queryKey: queryKeys.admin.orders.detail(orderNumber ?? ''),
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
  const errorToast = useApiErrorToast();
  return useMutation<
    OrderDetailDto,
    Error,
    { toStatus: OrderStatus; reason?: string | null }
  >({
    mutationFn: (input) => adminOrdersApi.transition(orderNumber, input),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.admin.orders.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}

export function useApproveProofMutation({ orderNumber }: MutationCommonArgs) {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    OrderDetailDto,
    Error,
    { proofId: string; reviewNote?: string | null }
  >({
    mutationFn: ({ proofId, reviewNote }) =>
      adminOrdersApi.approveProof(orderNumber, proofId, { reviewNote }),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.admin.orders.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}

export function useRejectProofMutation({ orderNumber }: MutationCommonArgs) {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    OrderDetailDto,
    Error,
    { proofId: string; reviewNote: string }
  >({
    mutationFn: ({ proofId, reviewNote }) =>
      adminOrdersApi.rejectProof(orderNumber, proofId, { reviewNote }),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.admin.orders.detail(orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.listRoot(), exact: false });
    },
    onError: errorToast,
  });
}
