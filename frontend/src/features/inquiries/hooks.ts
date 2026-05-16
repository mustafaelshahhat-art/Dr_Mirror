import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PagedResult } from '../../shared/types/paged-result';
import { inquiriesApi } from './api';
import type { InquiryDto, InquiryStatus, SubmitInquiryRequest } from './types';

const KEYS = {
  adminList: (status: InquiryStatus | undefined, page: number) =>
    ['admin', 'inquiries', { status, page }] as const,
};

export function useSubmitInquiryMutation() {
  return useMutation<InquiryDto, Error, SubmitInquiryRequest>({
    mutationFn: (body) => inquiriesApi.submit(body),
  });
}

export function useAdminInquiriesQuery(status?: InquiryStatus, page = 1, pageSize = 25) {
  return useQuery<PagedResult<InquiryDto>>({
    queryKey: KEYS.adminList(status, page),
    queryFn: () => inquiriesApi.adminList({ status, page, pageSize }),
    staleTime: 15_000,
  });
}

export function useMarkInquiryReadMutation() {
  const queryClient = useQueryClient();
  return useMutation<InquiryDto, Error, string>({
    mutationFn: (id) => inquiriesApi.adminMarkRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'], exact: false });
    },
  });
}

export function useMarkInquiryRespondedMutation() {
  const queryClient = useQueryClient();
  return useMutation<InquiryDto, Error, string>({
    mutationFn: (id) => inquiriesApi.adminMarkResponded(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'], exact: false });
    },
  });
}
