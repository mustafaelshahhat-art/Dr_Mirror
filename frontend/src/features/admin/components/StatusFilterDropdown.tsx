import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import { orderStatusTranslationKey } from '../../orders/components/orderStatusTranslationKey';
import { ORDER_STATUSES, type OrderStatus } from '../../orders/types';

interface StatusFilterDropdownProps {
  value: OrderStatus | undefined;
  onChange: (next: OrderStatus | undefined) => void;
}

const ALL_STATUSES: OrderStatus[] = [
  ORDER_STATUSES.Pending,
  ORDER_STATUSES.PendingPaymentReview,
  ORDER_STATUSES.Confirmed,
  ORDER_STATUSES.Paid,
  ORDER_STATUSES.Preparing,
  ORDER_STATUSES.Shipped,
  ORDER_STATUSES.Delivered,
  ORDER_STATUSES.Cancelled,
];

export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const { t } = useTranslation();
  return (
    <SelectField
      label={t('admin.filters.status')}
      hideLabel
      value={value === undefined ? '' : String(value)}
      emptyLabel={t('admin.filters.all')}
      onChange={(next) => onChange(next === '' ? undefined : (Number(next) as OrderStatus))}
      options={ALL_STATUSES.map((status) => ({
        value: String(status),
        label: t(orderStatusTranslationKey(status)),
      }))}
      className="w-full sm:w-52"
    />
  );
}
