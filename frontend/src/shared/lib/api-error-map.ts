export type ErrorToastKey =
  | 'errors.toast.generic'
  | 'errors.toast.serverError'
  | 'errors.toast.validation'
  | 'errors.toast.signedOut'
  | 'errors.toast.forbidden'
  | 'errors.toast.rateLimited'
  | 'errors.toast.orderNotFound'
  | 'errors.toast.proofNotFound'
  | 'errors.toast.proofPurged'
  | 'errors.toast.inquiryNotFound'
  | 'errors.toast.addressNotFound'
  | 'errors.toast.addressInUse'
  | 'errors.toast.idempotencyConflict'
  | 'errors.toast.orderStateConflict'
  | 'errors.toast.fileTooLarge'
  | 'errors.toast.fileTypeUnsupported';

export const apiErrorMap = {
  '400:title:Validation failed': 'errors.toast.validation',
  '401': 'errors.toast.signedOut',
  '403:title:Forbidden': 'errors.toast.forbidden',
  '404:title:Order not found': 'errors.toast.orderNotFound',
  '404:title:Proof not found': 'errors.toast.proofNotFound',
  '404:title:Inquiry not found': 'errors.toast.inquiryNotFound',
  '404:title:Address not found': 'errors.toast.addressNotFound',
  '409:title:Address in use': 'errors.toast.addressInUse',
  '409:title:Idempotency conflict': 'errors.toast.idempotencyConflict',
  '409:title:Order state conflict': 'errors.toast.orderStateConflict',
  '410': 'errors.toast.proofPurged',
  '413': 'errors.toast.fileTooLarge',
  '415': 'errors.toast.fileTypeUnsupported',
  '422': 'errors.toast.validation',
  '429': 'errors.toast.rateLimited',
} as const satisfies Record<string, ErrorToastKey>;

export function lookupErrorKey(status?: number, title?: string, type?: string): ErrorToastKey {
  if (status === undefined) return 'errors.toast.generic';
  if (status >= 500) return 'errors.toast.serverError';

  const map: Record<string, ErrorToastKey> = apiErrorMap;

  if (title) {
    const key = map[`${status}:title:${title}`];
    if (key) return key;
  }

  if (type) {
    const key = map[`${status}:type:${type}`];
    if (key) return key;
  }

  const statusKey = map[String(status)];
  return statusKey ?? 'errors.toast.generic';
}
