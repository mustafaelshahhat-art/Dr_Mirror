import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiErrorToast } from '../../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../../shared/lib/query-keys';
import type { PagedResult } from '../../../shared/types/paged-result';
import { adminUsersApi } from './api';
import type { AdminUserDto, UserRole } from './types';

export function useAdminUsersQuery(q?: string, page = 1, pageSize = 25) {
  return useQuery<PagedResult<AdminUserDto>>({
    queryKey: queryKeys.admin.users.list(q, page),
    queryFn: () => adminUsersApi.list({ q, page, pageSize }),
    staleTime: 30_000,
  });
}

export function useUpdateUserRolesMutation() {
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();

  return useMutation<AdminUserDto, Error, { userId: string; roles: UserRole[] }>({
    mutationFn: ({ userId, roles }) => adminUsersApi.updateRoles(userId, roles),
    onSuccess: (updated) => {
      queryClient.setQueriesData<PagedResult<AdminUserDto>>(
        { queryKey: queryKeys.admin.users.root(), exact: false },
        (current) => current
          ? {
              ...current,
              items: current.items.map((user) => user.id === updated.id ? updated : user),
            }
          : current,
      );
    },
    onError: errorToast,
  });
}
