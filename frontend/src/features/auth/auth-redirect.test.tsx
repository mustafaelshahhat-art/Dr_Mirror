import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ForbiddenBanner } from '../../shared/components/ForbiddenBanner';
import { makeAdminUser, makeAuthValue, makeBuyerUser, renderWithProviders } from '../../test/utils';
import { AdminRoute, PublicOnlyRoute } from './ProtectedRoute';
import { resolvePostAuthDestination } from './postAuthDestination';

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

describe('auth redirect boundaries', () => {
  it('sends signed-in admins to the admin surface by default', () => {
    expect(resolvePostAuthDestination(makeAdminUser(), null)).toBe('/admin');
  });

  it('sends signed-in buyers to the storefront by default', () => {
    expect(resolvePostAuthDestination(makeBuyerUser(), null)).toBe('/');
  });

  it('sends buyers to a safe non-admin redirect target after login', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<h1>Login</h1>} />
        </Route>
        <Route path="/checkout" element={<h1>Checkout</h1>} />
      </Routes>,
      {
        route: '/login?next=/checkout',
        authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
      },
    );

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });

  it('bounces buyers away from admin routes with the forbidden banner', async () => {
    renderWithProviders(
      <>
        <ForbiddenBanner />
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<h1>Admin users</h1>} />
          </Route>
          <Route path="/" element={<h1>Storefront</h1>} />
          <Route path="/login" element={<h1>Login</h1>} />
        </Routes>
      </>,
      {
        route: '/admin/users',
        authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false }),
      },
    );

    expect(await screen.findByRole('heading', { name: 'Storefront' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('admin dashboard is for operators only');
  });
});
