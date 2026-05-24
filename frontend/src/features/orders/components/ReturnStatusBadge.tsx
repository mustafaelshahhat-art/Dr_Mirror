import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import type { ReturnStatus } from '../types';

const STATUS_KEY: Record<ReturnStatus, string> = {
  Requested: 'returns.status.requested',
  Approved: 'returns.status.approved',
  Rejected: 'returns.status.rejected',
  Received: 'returns.status.received',
  Completed: 'returns.status.completed',
  Cancelled: 'returns.status.cancelled',
};

const STATUS_COLOR: Record<ReturnStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  Requested: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Received: 'warning',
  Completed: 'success',
  Cancelled: 'default',
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const { t } = useTranslation();

  return (
    <Chip variant="soft" size="sm" color={STATUS_COLOR[status]}>
      {t(STATUS_KEY[status])}
    </Chip>
  );
}
