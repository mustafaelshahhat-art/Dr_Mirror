import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addressApi } from './api';
import type { BuyerAddressDto, BuyerAddressUpsertRequest } from './types';

const KEYS = {
  list: () => ['addresses'] as const,
};

export function useAddressesQuery() {
  return useQuery<BuyerAddressDto[]>({
    queryKey: KEYS.list(),
    queryFn: () => addressApi.list(),
    staleTime: 30_000,
  });
}

export function useCreateAddressMutation() {
  const qc = useQueryClient();
  return useMutation<BuyerAddressDto, Error, BuyerAddressUpsertRequest>({
    mutationFn: (body) => addressApi.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}

export function useUpdateAddressMutation() {
  const qc = useQueryClient();
  return useMutation<
    BuyerAddressDto,
    Error,
    { id: string; body: BuyerAddressUpsertRequest }
  >({
    mutationFn: ({ id, body }) => addressApi.update(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}

export function useDeleteAddressMutation() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => addressApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}

export function useSetDefaultAddressMutation() {
  const qc = useQueryClient();
  return useMutation<BuyerAddressDto, Error, string>({
    mutationFn: (id) => addressApi.setDefault(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}
