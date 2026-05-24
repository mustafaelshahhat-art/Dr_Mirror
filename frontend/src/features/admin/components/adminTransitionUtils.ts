import { paymentMethodGroup } from '../../orders/lib/paymentMethodGroup';
import { ORDER_STATUSES, type OrderDetailDto, type OrderStatus } from '../../orders/types';

export function visibleAdminNextStates(order: OrderDetailDto): OrderStatus[] {
  const group = paymentMethodGroup(order.paymentMethodKind);

  if (group === 'proof' && order.status === ORDER_STATUSES.PendingPaymentReview) {
    return order.allowedNextStatesForAdmin.filter((status) =>
      status === ORDER_STATUSES.Paid || status === ORDER_STATUSES.Pending,
    );
  }

  if (group === 'proof' && order.status === ORDER_STATUSES.Pending) {
    return order.allowedNextStatesForAdmin.filter((status) => !isFulfillmentStatus(status));
  }

  if (order.status === ORDER_STATUSES.Paid) {
    return order.allowedNextStatesForAdmin.filter((status) => status === ORDER_STATUSES.Preparing);
  }

  if (order.status === ORDER_STATUSES.Preparing) {
    return order.allowedNextStatesForAdmin.filter((status) => status === ORDER_STATUSES.Shipped);
  }

  return order.allowedNextStatesForAdmin;
}

function isFulfillmentStatus(status: OrderStatus): boolean {
  return status === ORDER_STATUSES.Preparing
    || status === ORDER_STATUSES.Shipped
    || status === ORDER_STATUSES.Delivered;
}
