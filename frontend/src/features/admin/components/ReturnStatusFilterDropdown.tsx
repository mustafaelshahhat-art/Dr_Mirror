import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import { RETURN_STATUSES, type ReturnStatus } from '../../orders/types';

interface ReturnStatusFilterDropdownProps {
  value: ReturnStatus | undefined;
  onChange: (next: ReturnStatus | undefined) => void;
}

const ALL_RETURN_STATUSES: ReturnStatus[] = [
  RETURN_STATUSES.Requested,
  RETURN_STATUSES.Approved,
  RETURN_STATUSES.Rejected,
  RETURN_STATUSES.Received,
  RETURN_STATUSES.Completed,
  RETURN_STATUSES.Cancelled,
];

const STATUS_KEY: Record<ReturnStatus, string> = {
  Requested: 'returns.status.requested',
  Approved: 'returns.status.approved',
  Rejected: 'returns.status.rejected',
  Received: 'returns.status.received',
  Completed: 'returns.status.completed',
  Cancelled: 'returns.status.cancelled',
};

export function ReturnStatusFilterDropdown({ value, onChange }: ReturnStatusFilterDropdownProps) {
  const { t } = useTranslation();
  return (
    <SelectField
      label={t('admin.filters.status')}
      hideLabel
      value={value === undefined ? '' : String(value)}
      emptyLabel={t('admin.filters.all')}
      onChange={(next) => onChange(next === '' ? undefined : (next as ReturnStatus))}
      options={ALL_RETURN_STATUSES.map((status) => ({
        value: String(status),
        label: t(STATUS_KEY[status]),
      }))}
      className="w-full sm:w-52"
    />
  );
}
