import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../shared/lib/query-keys';

import { checkoutApi } from './api';
import type { GovernorateDto } from './types';

export function useGovernoratesQuery() {
  return useQuery<GovernorateDto[]>({
    queryKey: queryKeys.shipping.governorates(),
    queryFn: () => checkoutApi.getGovernorates(),
    staleTime: 5 * 60_000,
  });
}
