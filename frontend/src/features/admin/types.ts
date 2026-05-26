export interface WhatsAppStatusCountsDto {
  sent: number;
  failed: number;
  skipped: number;
  retrying: number;
}

export interface WhatsAppStatusDto {
  connectionState: 'connected' | 'initializing' | 'disconnected' | 'qr_required' | 'auth_failed' | string;
  qrRequired: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  counts: WhatsAppStatusCountsDto;
}

export interface WhatsAppAttemptDto {
  id: string;
  eventType: string;
  recipientPhoneMasked: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped' | 'retrying' | string;
  attempts: number;
  failureReason: string | null;
  idempotencyKey: string;
  createdAt: string;
  deliveredAt: string | null;
  lastAttemptAt: string | null;
  entityType: 'Order' | 'Return' | null;
  entityId: string | null;
  entityReference: string | null;
  parentMessageId: string | null;
}
