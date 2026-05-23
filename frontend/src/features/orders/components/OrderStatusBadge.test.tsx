import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import testI18n from '../../../test/testI18n';
import { ORDER_STATUSES } from '../types';

import { OrderStatusBadge } from './OrderStatusBadge';

afterEach(() => {
  cleanup();
});

beforeEach(async () => {
  await testI18n.changeLanguage('en');
});

describe('OrderStatusBadge', () => {
  it('renders Confirmed customer status as Order placed', () => {
    renderWithProviders(<OrderStatusBadge status={ORDER_STATUSES.Confirmed} />);

    expect(screen.getByText('Order placed')).toBeInTheDocument();
  });

  it('never renders the unknown status i18n key for defined statuses', () => {
    const statuses = [
      ORDER_STATUSES.Pending,
      ORDER_STATUSES.Confirmed,
      ORDER_STATUSES.PendingPaymentReview,
      ORDER_STATUSES.Paid,
      ORDER_STATUSES.Preparing,
      ORDER_STATUSES.Shipped,
      ORDER_STATUSES.Delivered,
      ORDER_STATUSES.Cancelled,
    ];

    for (const status of statuses) {
      const { container, unmount } = renderWithProviders(<OrderStatusBadge status={status} />);
      expect(container).not.toHaveTextContent('orders.status.unknown');
      unmount();
    }
  });
});
