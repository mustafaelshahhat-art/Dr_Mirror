import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { CatalogPage } from './CatalogPage';

vi.mock('./api', () => ({
  catalogApi: {
    listCategories: vi.fn().mockResolvedValue([]),
    listProducts: vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 24,
      totalCount: 0,
      totalPages: 0,
    }),
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

import { catalogApi } from './api';

describe('CatalogPage — filter panel', () => {
  it('renders the filter toggle button', async () => {
    renderWithProviders(<CatalogPage />);
    expect(await screen.findByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('expands the filter panel when the Filters button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />);
    const btn = await screen.findByRole('button', { name: /filters/i });
    await user.click(btn);
    expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
  });

  it('calls listProducts with gender param when a gender chip is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />);
    const btn = await screen.findByRole('button', { name: /filters/i });
    await user.click(btn);
    const menBtn = screen.getByRole('radio', { name: 'Men' });
    await user.click(menBtn);
    await waitFor(() => {
      const calls = vi.mocked(catalogApi.listProducts).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.gender).toBe(0);
    });
  });

  it('clears all advanced filters when clear-all is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />, { route: '/?gender=0' });
    const btn = await screen.findByRole('button', { name: /filters/i });
    await user.click(btn);
    const clearBtn = await screen.findByRole('button', { name: /clear all/i });
    await user.click(clearBtn);
    await waitFor(() => {
      const calls = vi.mocked(catalogApi.listProducts).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.gender).toBeUndefined();
    });
  });
});
