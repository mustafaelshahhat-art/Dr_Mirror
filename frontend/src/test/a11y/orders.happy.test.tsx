import { describe, expect, it, vi } from 'vitest';

import { OrdersListPage } from '../../features/orders/OrdersListPage';
import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../utils';
import { axe } from '../axe';

vi.mock('../../features/orders/api', () => ({ ordersApi: {
  listMyOrders: vi.fn().mockResolvedValue({ items: [{ id: 'o1', orderNumber: 'DM-1', status: 0, total: 100, itemCount: 1, currency: 'EGP', createdAt: '2026-01-01T00:00:00Z' }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 }),
} }));

describe('a11y orders happy', () => {
  it('has no axe violations', async () => {
    const { container, findByText } = renderWithProviders(<OrdersListPage />, {
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }),
    });
    await findByText('DM-1');

    expect(await axe(container)).toHaveNoViolations();
  });
});
