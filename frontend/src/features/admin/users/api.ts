import { api } from '../../../shared/lib/api-client';
import type { PagedResult } from '../../../shared/types/paged-result';
import type { AdminUserDto } from './types';

export const adminUsersApi = {
  async list(params?: { q?: string; page?: number; pageSize?: number }): Promise<PagedResult<AdminUserDto>> {
    const { data } = await api.get<PagedResult<AdminUserDto>>('/admin/users', { params });
    return data;
  },
};
