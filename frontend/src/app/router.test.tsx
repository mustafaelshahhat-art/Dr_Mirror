import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, makeBuyerUser, renderWithProviders } from '../test/utils';
import { AppRoutes } from './router';

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
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 5, totalCount: 0, totalPages: 0 }),
    get: vi.fn().mockResolvedValue(null),
    transition: vi.fn().mockResolvedValue(null),
    approveProof: vi.fn().mockResolvedValue(null),
    rejectProof: vi.fn().mockResolvedValue(null),
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
    const adminHeading = screen.queryByRole('heading', { name: 'Admin dashboard' });
    expect(adminHeading).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Dr. Mirror' })).toBeInTheDocument();
  });

  it('admin at /admin sees the admin hub and no storefront header', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
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

  it('anonymous user at /inquiries can open the general inquiry page', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/inquiries',
      authValue: makeAuthValue(),
    });
    expect(await screen.findByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Send an inquiry' })).toBeInTheDocument();
  });

  it('bootstrapping state at /admin shows the loading spinner, not the admin hub', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ isBootstrapping: true }),
    });
    expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });

  it('admin at /cart is redirected to /admin', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/cart',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('admin at /checkout is redirected to /admin', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('admin at /inquiries is redirected to /admin', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/inquiries',
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('buyer at /admin is redirected to storefront', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/admin',
      authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
    });
    expect(await screen.findByRole('link', { name: 'Dr. Mirror' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });

  it('anonymous at /checkout is redirected to login', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      authValue: makeAuthValue(),
    });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('anonymous at /account/orders is redirected to login', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/account/orders',
      authValue: makeAuthValue(),
    });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
