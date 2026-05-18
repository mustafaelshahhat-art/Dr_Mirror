import { api } from '../../../shared/lib/api-client';
import type { PagedResult } from '../../../shared/types/paged-result';
import type { AuditLogEntryDto, AuditLogParams } from './types';

export const adminAuditApi = {
  async list(params?: AuditLogParams): Promise<PagedResult<AuditLogEntryDto>> {
    const { data } = await api.get<PagedResult<AuditLogEntryDto>>('/admin/audit', { params });
    return data;
  },

  async get(id: string): Promise<AuditLogEntryDto> {
    const { data } = await api.get<AuditLogEntryDto>(
      `/admin/audit/${encodeURIComponent(id)}`,
    );
    return data;
  },
};
