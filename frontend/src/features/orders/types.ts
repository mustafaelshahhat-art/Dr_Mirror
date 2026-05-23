/**
 * Wire types for the orders + checkout slices. Mirror the backend DTOs
 * (`Features/Orders/Common/OrderDtos.cs`) exactly — never let them drift.
 */

/** Stays in lock-step with backend OrderStatus enum (Domain/Orders). */
export type OrderStatus =
  | 0 // Pending
  | 1 // Confirmed
  | 2 // PendingPaymentReview
  | 3 // Paid
  | 4 // Preparing
  | 5 // Shipped
  | 6 // Delivered
  | 99; // Cancelled

export const ORDER_STATUSES = {
  Pending: 0,
  Confirmed: 1,
  PendingPaymentReview: 2,
  Paid: 3,
  Preparing: 4,
  Shipped: 5,
  Delivered: 6,
  Cancelled: 99,
} as const satisfies Record<string, OrderStatus>;

export type PaymentMethodKind =
  | 0 // Cod
  | 1 // Instapay
  | 2 // Wallet
  | 3; // BankTransfer

export const PAYMENT_METHOD_KIND = {
  Cod: 0,
  Instapay: 1,
  Wallet: 2,
  BankTransfer: 3,
} as const satisfies Record<string, PaymentMethodKind>;

export type PaymentProofStatus =
  | 0 // Pending
  | 1 // Approved
  | 2; // Rejected

export const PAYMENT_PROOF_STATUS = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const satisfies Record<string, PaymentProofStatus>;

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
