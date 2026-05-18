export interface AuditLogEntryDto {
  id: string;
  timestamp: string;
  actorName: string;
  actionType: string;
  targetType: string;
  targetId: string;
  summary: string;
  statusBefore?: string;
  statusAfter?: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  actionType?: string;
  targetType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}
