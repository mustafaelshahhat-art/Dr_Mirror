import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminUsersApi } from './api';
import type { AdminUserDto, UpdateUserRolesRequest } from './types';

const KEYS = {
  list: (q?: string) => ['admin', 'users', { q }] as const,
};

export function useAdminUsersQuery(q?: string) {
  return useQuery<AdminUserDto[]>({
    queryKey: KEYS.list(q),
    queryFn: () => adminUsersApi.list({ q }),
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
