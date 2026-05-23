export interface AuditLogEntryDto {
  id: number;
  actorUserId: string;
  actorDisplayName: string | null;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  previousStatus: string | null;
  newStatus: string | null;
  note: string | null;
  correlationId: string | null;
  timestampUtc: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}
