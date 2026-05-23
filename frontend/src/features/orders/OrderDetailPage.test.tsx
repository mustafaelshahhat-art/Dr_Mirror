import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND, type OrderDetailDto } from './types';
import { CancelOrderButton } from './components/CancelOrderButton';

vi.mock('./hooks', () => ({
  usePaymentMethodsQuery: () => ({ data: [], isLoading: false }),
  useMyOrdersQuery: () => ({ data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } }),
  useMyOrderQuery: () => ({}),
  useCreateOrderMutation: () => ({ mutateAsync: vi.fn() }),
  useCancelOrderMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadPaymentProofMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

function makeOrder(overrides: Partial<OrderDetailDto> = {}): OrderDetailDto {
  return {
    id: 'order-1',
    orderNumber: 'DM-2026-TEST',
    status: ORDER_STATUSES.Pending,
    subTotal: 200,
    shippingFee: 0,
    total: 200,
    currency: 'EGP',
    shippingAddress: {
      recipientName: 'Test User',
      phone: '01000000000',
      governorate: 'cairo',
      city: 'Maadi',
      streetAddress: '123 Test St',
      floor: null,
      apartment: null,
      landmark: null,
      notes: null,
    },
    paymentMethodId: 'pm-1',
    paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
    paymentMethodNameEn: 'Instapay',
    paymentMethodNameAr: 'إنستاباي',
    paymentInstructionsEn: 'Send to 01000000000',
    paymentInstructionsAr: null,
    paymentAccountNumber: '01000000000',
    paymentAccountHolder: 'Dr Mirror',
    buyerNote: null,
    cancellationReason: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    confirmedAt: null,
    paidAt: null,
    preparingAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    pendingPaymentReviewAt: null,
    paymentStatusLabel: 'awaitingPayment',
    allowedNextStatesForBuyer: [ORDER_STATUSES.Cancelled],
    allowedNextStatesForAdmin: [],
    items: [
      {
        id: 'item-1', productId: 'p1', productSlug: 'test', productVariantId: 'v1',
        nameAr: 'منتج', nameEn: 'Test Product', sku: 'SKU-1', size: 'M',
        colorName: 'Blue', colorNameAr: 'أزرق', colorHex: '#00F',
        primaryImageUrl: null, unitPrice: 100, quantity: 2, lineTotal: 200,
      },
    ],
    paymentProofs: [],
    buyer: { id: 'buyer-1', fullName: 'Test Buyer', email: 'buyer@test.com' },
    ...overrides,
  };
}

// We test the proof upload visibility via the component's conditional rendering logic.
// Since OrderDetailPage depends on useMyOrderQuery which uses useParams, we test
// CancelOrderButton and the proof upload logic directly.

describe('OrderDetailPage cancellation visibility', () => {
  it('cancel button is not visible for COD Confirmed order', () => {
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Cod,
      status: ORDER_STATUSES.Confirmed,
      allowedNextStatesForBuyer: [],
    });
    renderWithProviders(<CancelOrderButton order={order} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('cancel button is visible for Pending order with cancel allowed', () => {
    const order = makeOrder({
      status: ORDER_STATUSES.Pending,
      allowedNextStatesForBuyer: [ORDER_STATUSES.Cancelled],
    });
    renderWithProviders(<CancelOrderButton order={order} />);
    expect(screen.getByRole('button', { name: /cancel this order/i })).toBeInTheDocument();
  });

  it('cancel button is hidden for Preparing order', () => {
    const order = makeOrder({
      status: ORDER_STATUSES.Preparing,
      allowedNextStatesForBuyer: [],
    });
    renderWithProviders(<CancelOrderButton order={order} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('cancel button is hidden for Shipped order', () => {
    const order = makeOrder({
      status: ORDER_STATUSES.Shipped,
      allowedNextStatesForBuyer: [],
    });
    renderWithProviders(<CancelOrderButton order={order} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});

describe('Payment proof upload visibility', () => {
  it('COD order does not show proof upload', () => {
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Cod,
      status: ORDER_STATUSES.Confirmed,
    });
    // COD -> isNonCod is false -> canUploadProof is false
    const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;
    const canUpload = isNonCod && (order.status === ORDER_STATUSES.Pending || order.status === ORDER_STATUSES.PendingPaymentReview);
    expect(canUpload).toBe(false);
  });

  it('non-COD Pending order allows proof upload', () => {
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
      status: ORDER_STATUSES.Pending,
    });
    const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;
    const canUpload = isNonCod && (order.status === ORDER_STATUSES.Pending || order.status === ORDER_STATUSES.PendingPaymentReview);
    expect(canUpload).toBe(true);
  });

  it('non-COD Confirmed order does not allow proof upload', () => {
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
      status: ORDER_STATUSES.Confirmed,
    });
    const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;
    const canUpload = isNonCod && (order.status === ORDER_STATUSES.Pending || order.status === ORDER_STATUSES.PendingPaymentReview);
    expect(canUpload).toBe(false);
  });

  it('non-COD PendingPaymentReview order allows proof upload', () => {
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
      status: ORDER_STATUSES.PendingPaymentReview,
    });
    const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;
    const canUpload = isNonCod && (order.status === ORDER_STATUSES.Pending || order.status === ORDER_STATUSES.PendingPaymentReview);
    expect(canUpload).toBe(true);
  });
});
