import { useTranslation } from 'react-i18next';
import type { ReturnStatus } from '../types';
import { StatusBadge, type StatusColor } from '../../../shared/components/StatusPill';

const STATUS_KEY: Record<ReturnStatus, string> = {
  Requested: 'returns.status.requested',
  Approved: 'returns.status.approved',
  Rejected: 'returns.status.rejected',
  Received: 'returns.status.received',
  Completed: 'returns.status.completed',
  Cancelled: 'returns.status.cancelled',
};

const STATUS_COLOR: Record<ReturnStatus, StatusColor> = {
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
    <StatusBadge 
      color={STATUS_COLOR[status]} 
      label={t(STATUS_KEY[status])} 
    />
  );
}
