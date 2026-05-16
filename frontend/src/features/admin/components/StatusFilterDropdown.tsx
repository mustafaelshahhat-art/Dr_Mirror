import { useTranslation } from 'react-i18next';

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

/**
 * Plain &lt;select&gt;-based filter for the admin orders list. RAC's combobox
 * would be heavier than we need here — staff will hammer this dropdown all
 * day; the native control is the right tool.
 */
export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const { t } = useTranslation();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-default-500">{t('admin.filters.status')}</span>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : (Number(v) as OrderStatus));
        }}
        className="rounded-medium border border-divider bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{t('admin.filters.all')}</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(orderStatusTranslationKey(s))}
          </option>
        ))}
      </select>
    </label>
  );
}
