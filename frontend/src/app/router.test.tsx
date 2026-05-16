import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, makeBuyerUser, renderWithProviders } from '../test/utils';
import { AppRoutes } from './router';

// Prevent real HTTP calls from CartProvider and AdminHubPage during routing assertions.
vi.mock('../features/cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    update: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    remove: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    clear: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
  },
}));

vi.mock('../features/admin/api', () => ({
  adminOrdersApi: {
    stats: vi.fn().mockResolvedValue({ totalOrders: 0, countsByStatus: {} }),
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe('AppRoutes — role routing', () => {
  it('anonymous user at /admin is redirected to the login page', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue(),
    });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('buyer at /admin is redirected to the storefront (/ via CustomerRoute)', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
    });
    // Redirected away from /admin — admin hub heading must not appear.
    const adminHeading = screen.queryByRole('heading', { name: 'Admin dashboard' });
    expect(adminHeading).not.toBeInTheDocument();
    // Storefront Layout (with Header) wraps the redirected destination.
    expect(await screen.findByRole('link', { name: 'Dr. Mirror' })).toBeInTheDocument();
  });

  it('admin at /admin sees the admin hub and no storefront header', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    // Storefront Header returns null for admins — brand link must be absent.
    expect(screen.queryByRole('link', { name: 'Dr. Mirror' })).not.toBeInTheDocument();
  });

  it('admin at / is redirected to /admin by CustomerRoute', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('buyer at /cart sees the storefront header', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/cart',
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
    });
    expect(await screen.findByRole('link', { name: 'Dr. Mirror' })).toBeInTheDocument();
  });

  it('anonymous user at /cart is allowed by CustomerRoute and sees the storefront header', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/cart',
      authValue: makeAuthValue(),
    });
    expect(await screen.findByRole('link', { name: 'Dr. Mirror' })).toBeInTheDocument();
  });

  it('bootstrapping state at /admin shows the loading spinner, not the admin hub', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ isBootstrapping: true }),
    });
    // AdminRoute renders the spinner while bootstrapping.
    expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });
});
