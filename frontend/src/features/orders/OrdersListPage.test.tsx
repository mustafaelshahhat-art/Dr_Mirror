import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../../test/utils';
import { OrdersListPage } from './OrdersListPage';

vi.mock('./api', () => ({
  ordersApi: {
    listMyOrders: vi.fn(),
  },
}));

vi.mock('../../features/cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    update: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    remove: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    clear: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
  },
}));

import { ordersApi } from './api';

const buyer = makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false });

function makePagedResult<T>(items: T[], page = 1, totalPages = 1) {
  return { items, page, pageSize: 20, totalCount: items.length, totalPages };
}

describe('OrdersListPage', () => {
  it('shows loading spinner initially', () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue(
      makePagedResult([]),
    );
    renderWithProviders(<OrdersListPage />, { authValue: buyer });
    expect(screen.getByLabelText('Loading orders...')).toBeInTheDocument();
  });

  it('renders empty state when there are no orders', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue(makePagedResult([]));
    renderWithProviders(<OrdersListPage />, { authValue: buyer });
    expect(await screen.findByText("You haven't ordered yet")).toBeInTheDocument();
  });

  it('hides pagination when totalPages is 1', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue(
      makePagedResult(
        [{ id: '1', orderNumber: 'ORD-001', status: 0, total: 100, itemCount: 1, currency: 'EGP', createdAt: new Date().toISOString() }],
        1,
        1,
      ),
    );
    renderWithProviders(<OrdersListPage />, { authValue: buyer });
    await screen.findByText('ORD-001');
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  });

  it('shows pagination controls when totalPages > 1', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue(
      makePagedResult(
        [{ id: '1', orderNumber: 'ORD-001', status: 0, total: 100, itemCount: 1, currency: 'EGP', createdAt: new Date().toISOString() }],
        1,
        3,
      ),
    );
    renderWithProviders(<OrdersListPage />, { authValue: buyer });
    expect(await screen.findByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('prev button is disabled on page 1', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue(
      makePagedResult([], 1, 3),
    );
    renderWithProviders(<OrdersListPage />, { authValue: buyer });
    const prev = await screen.findByRole('button', { name: 'Previous' });
    expect(prev).toBeDisabled();
  });
});
