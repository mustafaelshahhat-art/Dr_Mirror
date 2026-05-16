import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, makeBuyerUser, renderWithProviders } from '../../../test/utils';
import { AdminHeader } from './AdminHeader';

vi.mock('../../../features/cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    update: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    remove: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    clear: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
  },
}));

describe('AdminHeader', () => {
  it('returns null for non-admin users', () => {
    renderWithProviders(<AdminHeader onMenuPress={vi.fn()} />, {
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
    });

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders the admin header for admin users', () => {
    renderWithProviders(<AdminHeader onMenuPress={vi.fn()} />, {
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
  });

  it('uses the active admin route as the header title', () => {
    renderWithProviders(<AdminHeader onMenuPress={vi.fn()} />, {
      route: '/admin/orders',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });

    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument();
  });

  it('shows product create breadcrumb context', () => {
    renderWithProviders(<AdminHeader onMenuPress={vi.fn()} />, {
      route: '/admin/products/new',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });

    expect(screen.getByText('Products / New product')).toBeInTheDocument();
  });
});
