import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../../shared/lib/query-keys';

import { adminShippingApi } from './api';
import type {
  AdminGovernorateShippingFeeDto,
  AdminGovernorateShippingFeeUpdateRequest,
} from './types';

export function useAdminGovernorateShippingFeesQuery() {
  return useQuery<AdminGovernorateShippingFeeDto[]>({
    queryKey: queryKeys.admin.shipping.governorates(),
    queryFn: () => adminShippingApi.listGovernorates(),
    staleTime: 0,
  });
}

export function useUpdateGovernorateShippingFeeMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();

  return useMutation<
    AdminGovernorateShippingFeeDto,
    Error,
    { id: string; body: AdminGovernorateShippingFeeUpdateRequest }
  >({
    mutationFn: ({ id, body }) => adminShippingApi.updateGovernorate(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.shipping.governorates() });
      void qc.invalidateQueries({ queryKey: queryKeys.shipping.governorates() });
    },
    onError: errorToast,
  });
}
