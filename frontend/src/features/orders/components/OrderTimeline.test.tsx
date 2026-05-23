import { screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import testI18n from '../../../test/testI18n';
import { OrderTimeline } from './OrderTimeline';
import type { OrderDetailDto } from '../types';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND } from '../types';

const makeCodOrder = (overrides?: Partial<OrderDetailDto>): OrderDetailDto => ({
  id: 'order-1',
  orderNumber: 'DM-2026-0001',
  status: ORDER_STATUSES.Preparing,
  subTotal: 500,
  shippingFee: 0,
  total: 500,
  currency: 'EGP',
  shippingAddress: {
    recipientName: 'Ahmed',
    phone: '+201001234567',
    governorate: 'cairo',
    city: 'Cairo',
    streetAddress: '10 St',
    floor: null,
    apartment: null,
    landmark: null,
    notes: null,
  },
  paymentMethodId: 'pm-1',
  paymentMethodKind: PAYMENT_METHOD_KIND.Cod,
  paymentMethodNameEn: 'Cash on Delivery',
  paymentMethodNameAr: 'الدفع عند الاستلام',
  paymentInstructionsEn: null,
  paymentInstructionsAr: null,
  paymentAccountNumber: null,
  paymentAccountHolder: null,
  buyerNote: null,
  cancellationReason: null,
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: '2026-01-15T10:30:00Z',
  confirmedAt: '2026-01-15T10:30:00Z',
  paidAt: null,
  preparingAt: '2026-01-16T08:00:00Z',
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  pendingPaymentReviewAt: null,
  paymentStatusLabel: 'cod',
  allowedNextStatesForBuyer: [],
  allowedNextStatesForAdmin: [ORDER_STATUSES.Shipped, ORDER_STATUSES.Cancelled],
  items: [],
  paymentProofs: [],
  buyer: { id: 'buyer-1', fullName: 'Ahmed', email: 'ahmed@example.com' },
  ...overrides,
});

const makeInstapayOrder = (overrides?: Partial<OrderDetailDto>): OrderDetailDto => ({
  ...makeCodOrder(),
  paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
  paymentMethodNameEn: 'Instapay',
  paymentMethodNameAr: 'إنستاباي',
  status: ORDER_STATUSES.Paid,
  paidAt: '2026-01-15T12:00:00Z',
  confirmedAt: null,
  preparingAt: null,
  pendingPaymentReviewAt: '2026-01-15T11:00:00Z',
  paymentStatusLabel: 'paid',
  allowedNextStatesForAdmin: [ORDER_STATUSES.Preparing, ORDER_STATUSES.Cancelled],
  ...overrides,
});

beforeEach(async () => {
  await testI18n.changeLanguage('en');
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light');
});

describe('OrderTimeline — preparingAt timestamp', () => {
  it('shows Preparing date when preparingAt is set', () => {
    const order = makeCodOrder({ preparingAt: '2026-01-16T08:00:00Z' });
    renderWithProviders(<OrderTimeline order={order} />);

    const preparingText = screen.getByText('Preparing');
    expect(preparingText).toBeInTheDocument();
    const dateEl = preparingText.parentElement!.querySelector('p:last-child');
    expect(dateEl).toBeInTheDocument();
    expect(dateEl!.textContent).toBeTruthy();
  });

  it('does not show date for Preparing when preparingAt is null', () => {
    const order = makeCodOrder({ preparingAt: null, status: ORDER_STATUSES.Confirmed, confirmedAt: '2026-01-15T10:30:00Z' });
    renderWithProviders(<OrderTimeline order={order} />);

    const preparingText = screen.getByText('Preparing');
    const dateEl = preparingText.parentElement!.querySelector('.tabular-nums');
    expect(dateEl).not.toBeInTheDocument();
  });

  it('renders timeline for Instapay order with Preparing date', () => {
    const order = makeInstapayOrder({
      status: ORDER_STATUSES.Preparing,
      preparingAt: '2026-01-16T14:00:00Z',
      allowedNextStatesForAdmin: [ORDER_STATUSES.Shipped, ORDER_STATUSES.Cancelled],
    });
    renderWithProviders(<OrderTimeline order={order} />);

    expect(screen.getByText('Preparing')).toBeInTheDocument();
    const preparingText = screen.getByText('Preparing');
    const dateEl = preparingText.parentElement!.querySelector('.tabular-nums');
    expect(dateEl).toBeInTheDocument();
  });
});

describe('OrderTimeline — COD payment status', () => {
  it('renders four fulfillment-only steps for COD order', () => {
    const order = makeCodOrder({ status: ORDER_STATUSES.Confirmed });
    renderWithProviders(<OrderTimeline order={order} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Order placed')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment under review')).not.toBeInTheDocument();
    expect(screen.queryByText('Paid')).not.toBeInTheDocument();
  });

  it('uses Arabic and English orderPlaced copy for the first COD step', async () => {
    const order = makeCodOrder({ status: ORDER_STATUSES.Confirmed });

    await testI18n.changeLanguage('en');
    const { unmount } = renderWithProviders(<OrderTimeline order={order} />);
    expect(screen.getByText('Order placed')).toBeInTheDocument();
    unmount();

    await testI18n.changeLanguage('ar');
    renderWithProviders(<OrderTimeline order={order} />);
    expect(screen.getByText('تم استلام الطلب')).toBeInTheDocument();
  });
});

describe('OrderTimeline — non-COD payment status', () => {
  it('shows Awaiting payment status for pending Instapay order', () => {
    const order = makeInstapayOrder({
      status: ORDER_STATUSES.Pending,
      paidAt: null,
      pendingPaymentReviewAt: null,
      paymentStatusLabel: 'awaitingPayment',
      allowedNextStatesForAdmin: [ORDER_STATUSES.Cancelled],
    });
    renderWithProviders(<OrderTimeline order={order} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
    expect(screen.getByText('Payment under review')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
