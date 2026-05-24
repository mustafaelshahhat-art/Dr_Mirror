import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import type { PagedResult } from '../../shared/types/paged-result';
import type { OrderDetailDto, OrderStatus, OrderSummaryDto, ReturnStatus } from '../orders/types';

import { adminOrdersApi, adminReturnsApi, type AdminReturnRequestDto } from './api';

export function useAdminReturnsQuery(params: {
  status?: ReturnStatus;
  page?: number;
  pageSize?: number;
}) {
  const { status, page = 1, pageSize = 25 } = params;
  return useQuery<PagedResult<AdminReturnRequestDto>>({
    queryKey: queryKeys.admin.orders.returnsList({ status, page, pageSize }),
    queryFn: () => adminReturnsApi.listReturns({ status, page, pageSize }),
    staleTime: 15_000,
  });
}

export function useAdminReturnQuery(returnId: string | undefined) {
  return useQuery<AdminReturnRequestDto>({
    queryKey: queryKeys.admin.orders.return(returnId ?? ''),
    queryFn: () => adminReturnsApi.getReturn(returnId!),
    enabled: Boolean(returnId),
    staleTime: 10_000,
  });
}

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
    onError: (error) => {
      errorToast(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.detail(orderNumber) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.listRoot(), exact: false });
    },
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
