import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { inquiriesApi } from './api';
import type { InquiryDto, InquiryStatus, SubmitInquiryRequest } from './types';

const KEYS = {
  adminList: (status: InquiryStatus | undefined) =>
    ['admin', 'inquiries', { status }] as const,
};

export function useSubmitInquiryMutation() {
  return useMutation<InquiryDto, Error, SubmitInquiryRequest>({
    mutationFn: (body) => inquiriesApi.submit(body),
  });
}

export function useAdminInquiriesQuery(status?: InquiryStatus) {
  return useQuery<InquiryDto[]>({
    queryKey: KEYS.adminList(status),
    queryFn: () => inquiriesApi.adminList({ status }),
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
