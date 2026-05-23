import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ORDER_STATUSES, type OrderDetailDto, type OrderStatus } from '../types';
import { paymentMethodGroup } from '../lib/paymentMethodGroup';
import { timelineLadder } from '../lib/timelineLadder';

import { orderStatusTranslationKey } from './orderStatusTranslationKey';

interface TimelinePoint {
  status: OrderStatus;
  at: string | null;
  reached: boolean;
}

/**
 * Vertical state-machine timeline. Renders the linear happy path the order
 * traversed, plus a "Cancelled" terminal node if the order was cancelled.
 */
export function OrderTimeline({ order }: { order: OrderDetailDto }) {
  const { t, i18n } = useTranslation();
  const points = buildPoints(order);
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' },
  );

  return (
    <ol className="flex flex-col gap-3">
      {points.map((p, idx) => {
        const isLast = idx === points.length - 1;
        const isCancelledPoint = p.status === ORDER_STATUSES.Cancelled;
        const Icon = isCancelledPoint ? XCircle : p.reached ? CheckCircle2 : Circle;
        return (
          <li key={p.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon
                className={[
                  'size-5 shrink-0',
                  isCancelledPoint
                    ? 'text-danger'
                    : p.reached
                      ? 'text-success'
                      : 'text-default-300',
                ].join(' ')}
                aria-hidden
              />
              {!isLast ? (
                <span
                  className={[
                    'mt-1 h-full w-px flex-1',
                    p.reached ? 'bg-success/40' : 'bg-divider',
                  ].join(' ')}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="flex-1 pb-2">
              <p
                className={[
                  'text-sm font-medium',
                  p.reached || isCancelledPoint ? 'text-foreground' : 'text-default-500',
                ].join(' ')}
              >
                {t(orderStatusTranslationKey(p.status))}
              </p>
              {p.at ? (
                <p className="mt-0.5 text-xs text-default-500 tabular-nums">
                  {dateFmt.format(new Date(p.at))}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function buildPoints(order: OrderDetailDto): TimelinePoint[] {
  const cancelledAt = order.cancelledAt;

  const group = paymentMethodGroup(order.paymentMethodKind);
  const ladder: Array<{ status: OrderStatus; at: string | null }> = timelineLadder(group).map((status) => ({
    status,
    at: timestampForStatus(order, status),
  }));

  const currentIndex = ladder.findIndex((p) => p.status === order.status);
  const points: TimelinePoint[] = ladder.map((p, idx) => ({
    status: p.status,
    at: p.at,
    reached:
      (currentIndex >= 0 && idx <= currentIndex) ||
      Boolean(p.at),
  }));

  if (cancelledAt) {
    points.push({
      status: ORDER_STATUSES.Cancelled,
      at: cancelledAt,
      reached: true,
    });
  }

  return points;
}

function timestampForStatus(order: OrderDetailDto, status: OrderStatus): string | null {
  switch (status) {
    case ORDER_STATUSES.Pending: return order.createdAt;
    case ORDER_STATUSES.Confirmed: return order.confirmedAt;
    case ORDER_STATUSES.PendingPaymentReview: return order.pendingPaymentReviewAt ?? null;
    case ORDER_STATUSES.Paid: return order.paidAt;
    case ORDER_STATUSES.Preparing: return order.preparingAt ?? null;
    case ORDER_STATUSES.Shipped: return order.shippedAt;
    case ORDER_STATUSES.Delivered: return order.deliveredAt;
    case ORDER_STATUSES.Cancelled: return order.cancelledAt;
    default: return null;
  }
}
