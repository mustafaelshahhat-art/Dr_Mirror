import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../../test/utils';
import { adminCatalogApi } from './api';
import { AdminProductsListPage } from './AdminProductsListPage';

vi.mock('./api', () => ({
  adminCatalogApi: {
    listCategories: vi.fn(),
    listProducts: vi.fn(),
  },
}));

vi.mock('../../cart/api', () => ({
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

describe('AdminProductsListPage', () => {
  it('shows a retryable error state when products fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(adminCatalogApi.listCategories).mockResolvedValue([]);
    vi.mocked(adminCatalogApi.listProducts)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
      });

    renderWithProviders(<AdminProductsListPage />, { authValue: adminAuth });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load products");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No products match the current filters.')).toBeInTheDocument();
    expect(adminCatalogApi.listProducts).toHaveBeenCalledTimes(2);
  });
});
