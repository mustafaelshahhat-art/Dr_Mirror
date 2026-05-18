import { describe, expect, it, vi } from 'vitest';

import { OrdersListPage } from '../../features/orders/OrdersListPage';
import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../utils';
import { axe } from '../axe';

vi.mock('../../features/orders/api', () => ({ ordersApi: {
  listMyOrders: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }),
} }));

describe('a11y orders empty', () => {
  it('has no axe violations', async () => {
    const { container, findByText } = renderWithProviders(<OrdersListPage />, {
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }),
    });
    await findByText("You haven't ordered yet");

    expect(await axe(container)).toHaveNoViolations();
  });
});
