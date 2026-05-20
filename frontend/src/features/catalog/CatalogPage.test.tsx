import { screen } from '@testing-library/react';
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

describe('CatalogPage', () => {
  it('renders the catalog page and search input', async () => {
    renderWithProviders(<CatalogPage />);
    expect(await screen.findByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
