import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import testI18n from '../../../test/testI18n';
import { AdminTransitionActions } from './AdminTransitionActions';
import type { OrderDetailDto } from '../../orders/types';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND } from '../../orders/types';

const MOCK_ORDER_NUMBER = 'DM-2026-0001';

const makeOrder = (overrides?: Partial<OrderDetailDto>): OrderDetailDto => ({
  id: 'order-1',
  orderNumber: MOCK_ORDER_NUMBER,
  status: ORDER_STATUSES.Confirmed,
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
  preparingAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  pendingPaymentReviewAt: null,
  paymentStatusLabel: 'cod',
  allowedNextStatesForBuyer: [ORDER_STATUSES.Cancelled],
  allowedNextStatesForAdmin: [ORDER_STATUSES.Preparing, ORDER_STATUSES.Cancelled],
  items: [],
  paymentProofs: [],
  buyer: { id: 'buyer-1', fullName: 'Ahmed', email: 'ahmed@example.com' },
  ...overrides,
});

const mockTransitionMutateAsync = vi.fn();

vi.mock(import('../hooks'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAdminTransitionMutation: () =>
      ({
        mutateAsync: mockTransitionMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof actual.useAdminTransitionMutation>),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light');
});

describe('AdminTransitionActions — explicit action labels', () => {
  it('renders only Mark as Preparing and Cancel order for COD Confirmed', async () => {
    await testI18n.changeLanguage('en');

    renderWithProviders(<AdminTransitionActions order={makeOrder()} />);

    expect(screen.getByRole('button', { name: 'Mark as Preparing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.queryByText('admin.transition.actions.unknown')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Status' })).not.toBeInTheDocument();
  });

  it('does not render fulfillment buttons for proof-based Pending orders', async () => {
    await testI18n.changeLanguage('en');
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
      status: ORDER_STATUSES.Pending,
      allowedNextStatesForAdmin: [
        ORDER_STATUSES.Preparing,
        ORDER_STATUSES.Shipped,
        ORDER_STATUSES.Delivered,
        ORDER_STATUSES.Cancelled,
      ],
    });

    renderWithProviders(<AdminTransitionActions order={order} />);

    expect(screen.queryByRole('button', { name: 'Mark as Preparing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as Shipped' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as Delivered' })).not.toBeInTheDocument();
  });

  it('renders only proof-review actions for proof-based PendingPaymentReview orders', async () => {
    await testI18n.changeLanguage('en');
    const order = makeOrder({
      paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
      status: ORDER_STATUSES.PendingPaymentReview,
      allowedNextStatesForAdmin: [
        ORDER_STATUSES.Paid,
        ORDER_STATUSES.Pending,
        ORDER_STATUSES.Cancelled,
        ORDER_STATUSES.Preparing,
      ],
    });

    renderWithProviders(<AdminTransitionActions order={order} />);

    expect(screen.getByRole('button', { name: 'Approve payment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject payment proof' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as Preparing' })).not.toBeInTheDocument();
    expect(screen.queryByText('admin.transition.actions.unknown')).not.toBeInTheDocument();
  });
});

describe('AdminTransitionActions — conflict recovery', () => {
  it('resets local state and closes cancel dialog on mutation failure', async () => {
    await testI18n.changeLanguage('en');
    const order = makeOrder();
    mockTransitionMutateAsync.mockRejectedValue(new Error('409 Conflict'));

    renderWithProviders(<AdminTransitionActions order={order} />);

    const cancelButton = screen.getByRole('button', { name: /cancel order/i });
    await userEvent.click(cancelButton);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    const reasonField = screen.getByPlaceholderText(/required/i);
    await userEvent.type(reasonField, 'Wrong size');

    const confirmButtons = screen.getAllByRole('button', { name: /confirm/i });
    const dialogConfirm = confirmButtons[confirmButtons.length - 1];
    await userEvent.click(dialogConfirm);

    await waitFor(() => {
      expect(mockTransitionMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('resets inline confirmation panel on mutation failure', async () => {
    await testI18n.changeLanguage('en');
    const order = makeOrder();
    mockTransitionMutateAsync.mockRejectedValue(new Error('409 Conflict'));

    renderWithProviders(<AdminTransitionActions order={order} />);

    const preparingButton = screen.getByRole('button', { name: /preparing/i });
    await userEvent.click(preparingButton);

    expect(screen.getByText('Mark as Preparing?')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /^confirm$/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockTransitionMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Mark as Preparing?')).not.toBeInTheDocument();
    });
  });
});
