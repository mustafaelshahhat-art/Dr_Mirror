/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AuditLogEntryDto } from './types';

const AUDIT_STATUS_KEYS: Record<string, Record<string, string>> = {
  OrderStatusChanged: {
    Pending: 'orders.status.pending',
    Confirmed: 'orders.status.confirmed',
    PendingPaymentReview: 'orders.status.pendingPaymentReview',
    Paid: 'orders.status.paid',
    Preparing: 'orders.status.preparing',
    Shipped: 'orders.status.shipped',
    Delivered: 'orders.status.delivered',
    Cancelled: 'orders.status.cancelled',
  },
  PaymentReviewed: {
    Pending: 'orders.proofs.status.pending',
    Approved: 'orders.proofs.status.approved',
    Rejected: 'orders.proofs.status.rejected',
  },
  ProductUpdated: {
    Active: 'admin.catalog.status.active',
    Enabled: 'admin.catalog.status.active',
    Inactive: 'admin.catalog.status.inactive',
    Disabled: 'admin.catalog.status.inactive',
  },
};

const FALLBACK_KEYS: Record<string, string> = {
  New: 'inquiries.admin.status.new',
  Read: 'inquiries.admin.status.read',
  Responded: 'inquiries.admin.status.responded',
};

function auditStatusLabel(
  t: (key: string) => string,
  actionType: string,
  status: string | null,
): string | null {
  if (!status) return null;
  const map = AUDIT_STATUS_KEYS[actionType];
  const key = map?.[status] ?? FALLBACK_KEYS[status];
  return key ? t(key) : status;
}

interface AuditLogMobileCardsProps {
  entries: AuditLogEntryDto[];
  dateFmt: Intl.DateTimeFormat;
}

export function AuditLogMobileCards({ entries, dateFmt }: AuditLogMobileCardsProps) {
  const { t } = useTranslation();

  return (
    <ul role="list" className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} role="listitem">
          <Card className="rounded-large border border-divider/60">
            <Card.Content className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-default-500">
                  {t(`admin.audit.targetTypes.${entry.targetEntityType}`, { defaultValue: entry.targetEntityType })} #{entry.targetEntityId}
                </span>
                <span className="whitespace-nowrap text-xs tabular-nums text-default-500">
                  {dateFmt.format(new Date(entry.timestampUtc))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {t(`admin.audit.actionTypes.${entry.actionType}`, { defaultValue: entry.actionType })}
                </span>
                <span className="text-xs text-default-500">
                  {t('admin.audit.columns.actor')}: {entry.actorDisplayName ?? entry.actorUserId}
                </span>
              </div>
              {entry.previousStatus && entry.newStatus ? (
                <div className="text-xs text-default-500">
                  <span>{auditStatusLabel(t, entry.actionType, entry.previousStatus)}</span>
                  <ArrowRight className="mx-1 inline size-3 shrink-0 text-default-300 rtl:rotate-180" aria-hidden />
                  <span>{auditStatusLabel(t, entry.actionType, entry.newStatus)}</span>
                </div>
              ) : null}
            </Card.Content>
          </Card>
        </li>
      ))}
    </ul>
  );
}
