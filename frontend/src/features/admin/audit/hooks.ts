import { useQuery } from '@tanstack/react-query';

import type { PagedResult } from '../../../shared/types/paged-result';
import { adminAuditApi } from './api';
import type { AuditLogEntryDto, AuditLogParams } from './types';

const KEYS = {
  list: (params?: AuditLogParams) => ['admin', 'audit', params] as const,
  detail: (id: string) => ['admin', 'audit', id] as const,
};

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery<PagedResult<AuditLogEntryDto>>({
    queryKey: KEYS.list(params),
    queryFn: () => adminAuditApi.list(params),
    staleTime: 30_000,
  });
}

export function useAuditEntry(id: string) {
  return useQuery<AuditLogEntryDto>({
    queryKey: KEYS.detail(id),
    queryFn: () => adminAuditApi.get(id),
    enabled: !!id,
  });
}
