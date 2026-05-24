const ORDER_STATUS_KEYS: Record<string, string> = {
  Pending: 'orders.status.pending',
  Confirmed: 'orders.status.confirmed',
  PendingPaymentReview: 'orders.status.pendingPaymentReview',
  Paid: 'orders.status.paid',
  Preparing: 'orders.status.preparing',
  Shipped: 'orders.status.shipped',
  Delivered: 'orders.status.delivered',
  Cancelled: 'orders.status.cancelled',
};

const PROOF_STATUS_KEYS: Record<string, string> = {
  Pending: 'orders.proofs.status.pending',
  Approved: 'orders.proofs.status.approved',
  Rejected: 'orders.proofs.status.rejected',
};

const CATALOG_STATUS_KEYS: Record<string, string> = {
  Active: 'admin.catalog.status.active',
  Enabled: 'admin.catalog.status.active',
  Inactive: 'admin.catalog.status.inactive',
  Disabled: 'admin.catalog.status.inactive',
};

const INQUIRY_STATUS_KEYS: Record<string, string> = {
  New: 'inquiries.admin.status.new',
  Read: 'inquiries.admin.status.read',
  Responded: 'inquiries.admin.status.responded',
};

export function auditStatusLabel(
  t: (key: string) => string,
  actionType: string,
  status: string | null,
): string | null {
  if (!status) return null;

  const map = actionType === 'OrderStatusChanged'
    ? ORDER_STATUS_KEYS
    : actionType === 'PaymentReviewed'
      ? PROOF_STATUS_KEYS
      : actionType === 'ProductUpdated'
        ? CATALOG_STATUS_KEYS
        : {
            ...ORDER_STATUS_KEYS,
            ...PROOF_STATUS_KEYS,
            ...CATALOG_STATUS_KEYS,
            ...INQUIRY_STATUS_KEYS,
          };

  const key = map[status];
  return key ? t(key) : status;
}
