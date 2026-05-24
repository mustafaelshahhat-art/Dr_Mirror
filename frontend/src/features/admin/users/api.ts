import { api } from '../../../shared/lib/api-client';
import type { PagedResult } from '../../../shared/types/paged-result';
import type { AdminUserDto, UserRole } from './types';

export const adminUsersApi = {
  async list(params?: { q?: string; page?: number; pageSize?: number }): Promise<PagedResult<AdminUserDto>> {
    const { data } = await api.get<PagedResult<AdminUserDto>>('/admin/users', { params });
    return data;
  },

  async updateRoles(userId: string, roles: UserRole[]): Promise<AdminUserDto> {
    const { data } = await api.put<AdminUserDto>(
      `/admin/users/${encodeURIComponent(userId)}/roles`,
      { roles },
    );
    return data;
  },

  async disable(userId: string): Promise<AdminUserDto> {
    const { data } = await api.post<AdminUserDto>(
      `/admin/users/${encodeURIComponent(userId)}/disable`,
    );
    return data;
  },

  async enable(userId: string): Promise<AdminUserDto> {
    const { data } = await api.post<AdminUserDto>(
      `/admin/users/${encodeURIComponent(userId)}/enable`,
    );
    return data;
  },
};
