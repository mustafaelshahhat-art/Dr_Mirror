import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import type { PagedResult } from '../../shared/types/paged-result';
import { inquiriesApi } from './api';
import type { InquiryDto, InquiryStatus, SubmitInquiryRequest } from './types';

export function useSubmitInquiryMutation() {
  const errorToast = useApiErrorToast();
  return useMutation<InquiryDto, Error, SubmitInquiryRequest>({
    mutationFn: (body) => inquiriesApi.submit(body),
    onError: errorToast,
  });
}

export function useAdminInquiriesQuery(status?: InquiryStatus, page = 1, pageSize = 25) {
  return useQuery<PagedResult<InquiryDto>>({
    queryKey: queryKeys.admin.inquiries.list(status, page),
    queryFn: () => inquiriesApi.adminList({ status, page, pageSize }),
    staleTime: 15_000,
  });
}

export function useMarkInquiryReadMutation() {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<InquiryDto, Error, string>({
    mutationFn: (id) => inquiriesApi.adminMarkRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.inquiries.root(), exact: false });
    },
    onError: errorToast,
  });
}

export function useMarkInquiryRespondedMutation() {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<InquiryDto, Error, string>({
    mutationFn: (id) => inquiriesApi.adminMarkResponded(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.inquiries.root(), exact: false });
    },
    onError: errorToast,
  });
}
