import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { ORDER_STATUSES, type OrderStatus } from '../types';

import { orderStatusTranslationKey } from './orderStatusTranslationKey';

type ChipColor = 'accent' | 'danger' | 'default' | 'success' | 'warning';

function statusColor(status: OrderStatus): ChipColor {
  switch (status) {
    case ORDER_STATUSES.Pending:
    case ORDER_STATUSES.PendingPaymentReview:
      return 'warning';
    case ORDER_STATUSES.Confirmed:
    case ORDER_STATUSES.Paid:
      return 'accent';
    case ORDER_STATUSES.Preparing:
    case ORDER_STATUSES.Shipped:
      return 'default';
    case ORDER_STATUSES.Delivered:
      return 'success';
    case ORDER_STATUSES.Cancelled:
      return 'danger';
    default:
      return 'default';
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <Chip color={statusColor(status)} variant="soft" size="sm">
      <Chip.Label>{t(orderStatusTranslationKey(status))}</Chip.Label>
    </Chip>
  );
}
