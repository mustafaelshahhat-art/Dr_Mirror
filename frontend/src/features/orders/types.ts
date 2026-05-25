/**
 * Wire types for the orders + checkout slices. Mirror the backend DTOs
 * (`Features/Orders/Common/OrderDtos.cs`) exactly — never let them drift.
 */

/** Stays in lock-step with backend OrderStatus enum (Domain/Orders). */
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'PendingPaymentReview'
  | 'Paid'
  | 'Preparing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export const ORDER_STATUSES = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  PendingPaymentReview: 'PendingPaymentReview',
  Paid: 'Paid',
  Preparing: 'Preparing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
} as const satisfies Record<string, OrderStatus>;

export type PaymentMethodKind =
  | 'Cod'
  | 'Instapay'
  | 'Wallet'
  | 'BankTransfer';

export const PAYMENT_METHOD_KIND = {
  Cod: 'Cod',
  Instapay: 'Instapay',
  Wallet: 'Wallet',
  BankTransfer: 'BankTransfer',
} as const satisfies Record<string, PaymentMethodKind>;

export type PaymentProofStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected';

export const PAYMENT_PROOF_STATUS = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const satisfies Record<string, PaymentProofStatus>;

export type ReturnStatus =
  | 'Requested'
  | 'Approved'
  | 'Rejected'
  | 'Received'
  | 'Completed'
  | 'Cancelled';

export const RETURN_STATUSES = {
  Requested: 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Received: 'Received',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const satisfies Record<string, ReturnStatus>;

export interface ReturnRequestItemDto {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  primaryImageUrl: string | null;
  unitPrice: number;
  quantity: number;
}

export interface ReturnRequestDto {
  id: string;
  orderNumber: string;
  status: ReturnStatus;
  customerReason: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: ReturnRequestItemDto[];
}

export interface PaymentMethodDto {
  id: string;
  code: string;
  kind: PaymentMethodKind;
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  displayOrder: number;
}

export interface ShippingAddressDto {
  recipientName: string;
  phone: string;
  governorate: string;
  city: string;
  streetAddress: string;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  notes: string | null;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productSlug: string;
  productVariantId: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  primaryImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PaymentProofDto {
  id: string;
  fileUrl: string;
  originalFileName?: string | null;
  contentType: string;
  sizeBytes: number;
  status: PaymentProofStatus;
  reviewedByUserId: string | null;
  reviewedByUserName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  uploadedAt: string;
}

export type {
  AppConfigDto,
  PaymentProofUploadConfigDto,
  SupportConfigDto,
} from '../app-config/types';

export interface BuyerSummaryDto {
  id: string;
  fullName: string;
  email: string;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  currency: string;
  createdAt: string;
}

export type AddressSaveOutcome = 'not_requested' | 'saved' | 'skipped_book_full';

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subTotal: number;
  shippingFee: number;
  shippingGovernorateNameEn?: string | null;
  shippingGovernorateNameAr?: string | null;
  total: number;
  currency: string;
  shippingAddress: ShippingAddressDto;
  paymentMethodId: string;
  paymentMethodKind: PaymentMethodKind;
  paymentMethodNameEn: string;
  paymentMethodNameAr: string;
  paymentInstructionsEn: string | null;
  paymentInstructionsAr: string | null;
  paymentAccountNumber: string | null;
  paymentAccountHolder: string | null;
  buyerNote: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  preparingAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  pendingPaymentReviewAt: string | null;
  paymentStatusLabel: 'cod' | 'awaitingPayment' | 'underReview' | 'paid' | 'cancelled';
  allowedNextStatesForBuyer: OrderStatus[];
  allowedNextStatesForAdmin: OrderStatus[];
  items: OrderItemDto[];
  paymentProofs: PaymentProofDto[];
  buyer: BuyerSummaryDto;
  /**
   * Populated by the checkout-create endpoint to indicate whether the inline
   * shipping address was persisted to the buyer's address book.
   * Defaults to "not_requested" on plain order reads.
   */
  addressSaveOutcome?: AddressSaveOutcome;
}

export interface CheckoutPhoneVerificationRequiredDto {
  phoneVerificationRequired: true;
  sessionId: string;
  maskedPhone: string;
  cooldownSeconds: number;
  resendsRemaining: number;
  status: 'sending' | 'sent' | 'failed';
}

export type CreateOrderResult = OrderDetailDto | CheckoutPhoneVerificationRequiredDto;

export function isCheckoutPhoneVerificationRequired(
  value: CreateOrderResult,
): value is CheckoutPhoneVerificationRequiredDto {
  return 'phoneVerificationRequired' in value && value.phoneVerificationRequired === true;
}

// -----------------------------------------------------------------------------
// Request payloads
// -----------------------------------------------------------------------------

export interface CreateOrderRequest {
  paymentMethodId: string;
  /** When set, ships to a saved address. Mutually exclusive with shippingAddress. */
  buyerAddressId: string | null;
  /** Inline address payload — used when buyerAddressId is null. */
  shippingAddress: ShippingAddressDto | null;
  /** If true and shippingAddress is used, also persist to the buyer's address book. */
  saveAsNewAddress: boolean;
  /** Required when saveAsNewAddress is true. */
  label: string | null;
  buyerNote: string | null;
}

export interface CancelOrderRequest {
  reason: string | null;
}

export interface SubmitReturnRequest {
  customerReason: string;
}
