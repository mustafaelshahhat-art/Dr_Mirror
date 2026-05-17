import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PagedResult } from '../../../shared/types/paged-result';
import { adminUsersApi } from './api';
import type { AdminUserDto, UserRole } from './types';

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

  return useMutation<AdminUserDto, Error, { userId: string; roles: UserRole[] }>({
    mutationFn: ({ userId, roles }) => adminUsersApi.updateRoles(userId, roles),
    onSuccess: (updated) => {
      queryClient.setQueriesData<PagedResult<AdminUserDto>>(
        { queryKey: ['admin', 'users'], exact: false },
        (current) => current
          ? {
              ...current,
              items: current.items.map((user) => user.id === updated.id ? updated : user),
            }
          : current,
      );
    },
  });
}
