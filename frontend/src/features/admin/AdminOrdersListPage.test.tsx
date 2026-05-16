import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { ORDER_STATUSES } from '../orders/types';
import { adminOrdersApi } from './api';
import { AdminOrdersListPage } from './AdminOrdersListPage';

vi.mock('./api', () => ({
  adminOrdersApi: {
    list: vi.fn(),
  },
}));

vi.mock('../cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    update: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    remove: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    clear: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
  },
}));

const adminAuth = makeAuthValue({
  user: makeAdminUser(),
  isAuthenticated: true,
  isAdmin: true,
});

describe('AdminOrdersListPage', () => {
  it('opens an order from the keyboard-accessible order link', async () => {
    const user = userEvent.setup();
    vi.mocked(adminOrdersApi.list).mockResolvedValue({
      items: [
        {
          id: 'order-1',
          orderNumber: 'DM-1001',
          status: ORDER_STATUSES.PendingPaymentReview,
          total: 1250,
          itemCount: 2,
          currency: 'EGP',
          createdAt: '2026-01-15T10:30:00Z',
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });

    renderWithProviders(
      <Routes>
        <Route path="/admin/orders" element={<AdminOrdersListPage />} />
        <Route path="/admin/orders/:orderNumber" element={<h1>Order detail target</h1>} />
      </Routes>,
      { route: '/admin/orders', authValue: adminAuth },
    );

    const orderLink = await screen.findByRole('link', { name: 'Open order DM-1001' });
    orderLink.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Order detail target' })).toBeInTheDocument();
  });
});
