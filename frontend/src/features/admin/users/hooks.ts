import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PagedResult } from '../../../shared/types/paged-result';
import { adminUsersApi } from './api';
import type { AdminUserDto, UpdateUserRolesRequest } from './types';

const KEYS = {
  list: (q?: string, page?: number) => ['admin', 'users', { q, page }] as const,
};

export function useAdminUsersQuery(q?: string, page = 1, pageSize = 25) {
  return useQuery<PagedResult<AdminUserDto>>({
    queryKey: KEYS.list(q, page),
    queryFn: () => adminUsersApi.list({ q, page, pageSize }),
    staleTime: 30_000,
  });
}

export function useUpdateUserRolesMutation() {
  const queryClient = useQueryClient();
  return useMutation<AdminUserDto, Error, { userId: string; body: UpdateUserRolesRequest }>({
    mutationFn: ({ userId, body }) => adminUsersApi.updateRoles(userId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'], exact: false });
    },
  });
}
