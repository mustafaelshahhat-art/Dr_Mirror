/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { auditStatusLabel } from './auditUtils';
import type { AuditLogEntryDto } from './types';

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
