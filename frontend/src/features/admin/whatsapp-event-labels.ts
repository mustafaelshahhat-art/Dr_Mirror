export interface WhatsAppEventLabel {
  label: string;
  sublabel: string | null;
}

const EVENT_LABEL_MAP: Record<string, string> = {
  OrderConfirmation: 'Order confirmation',
  OrderStatusChanged: 'Order status changed',
  ReturnCreated: 'Return requested',
  ReturnStatusChanged: 'Return status changed',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  received: 'Received',
  completed: 'Completed',
};

function parseStatusFromIdempotencyKey(key: string): string | null {
  const parts = key.split(':');
  if (parts.length >= 3) {
    return parts[2];
  }
  return null;
}

export function getWhatsAppEventLabel(eventType: string, idempotencyKey: string): WhatsAppEventLabel {
  const label = EVENT_LABEL_MAP[eventType] ?? eventType;

  const status = parseStatusFromIdempotencyKey(idempotencyKey);

  let sublabel: string | null = null;

  if (eventType === 'OrderStatusChanged' && status) {
    sublabel = ORDER_STATUS_LABELS[status.toLowerCase()] ?? status;
  } else if (eventType === 'ReturnStatusChanged' && status) {
    sublabel = RETURN_STATUS_LABELS[status.toLowerCase()] ?? status;
  }

  return { label, sublabel };
}
