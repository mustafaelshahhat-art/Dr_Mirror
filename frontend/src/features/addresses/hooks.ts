import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import { addressApi } from './api';
import type { BuyerAddressDto, BuyerAddressUpsertRequest } from './types';

export function useAddressesQuery() {
  return useQuery<BuyerAddressDto[]>({
    queryKey: queryKeys.addresses.list(),
    queryFn: () => addressApi.list(),
    staleTime: 30_000,
  });
}

export function useCreateAddressMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<BuyerAddressDto, Error, BuyerAddressUpsertRequest>({
    mutationFn: (body) => addressApi.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses.list() }),
    onError: errorToast,
  });
}

export function useUpdateAddressMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<
    BuyerAddressDto,
    Error,
    { id: string; body: BuyerAddressUpsertRequest }
  >({
    mutationFn: ({ id, body }) => addressApi.update(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses.list() }),
    onError: errorToast,
  });
}

export function useDeleteAddressMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<void, Error, string>({
    mutationFn: (id) => addressApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses.list() }),
    onError: errorToast,
  });
}

export function useSetDefaultAddressMutation() {
  const qc = useQueryClient();
  const errorToast = useApiErrorToast();
  return useMutation<BuyerAddressDto, Error, string>({
    mutationFn: (id) => addressApi.setDefault(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses.list() }),
    onError: errorToast,
  });
}
