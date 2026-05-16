import { api } from '../../../shared/lib/api-client';
import type { PagedResult } from '../../../shared/types/paged-result';
import type { AdminUserDto, UpdateUserRolesRequest } from './types';

export const adminUsersApi = {
  async list(params?: { q?: string; page?: number; pageSize?: number }): Promise<PagedResult<AdminUserDto>> {
    const { data } = await api.get<PagedResult<AdminUserDto>>('/admin/users', { params });
    return data;
  },

  async updateRoles(userId: string, body: UpdateUserRolesRequest): Promise<AdminUserDto> {
    const { data } = await api.patch<AdminUserDto>(`/admin/users/${userId}/roles`, body);
    return data;
  },
};
