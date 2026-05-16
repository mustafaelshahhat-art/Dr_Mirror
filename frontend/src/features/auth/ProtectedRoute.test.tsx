/* eslint-disable i18next/no-literal-string */
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, makeBuyerUser, renderWithProviders } from '../../test/utils';
import { ForbiddenBanner } from '../../shared/components/ForbiddenBanner';
import { setForbiddenMessage } from '../../shared/lib/forbidden-store';
import type { AuthContextValue } from './AuthContext';
import { AdminRoute, CustomerRoute, ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

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

const buyerAuth = makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true, isAdmin: false });
const adminAuth = makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true });

describe('route gates', () => {
  beforeEach(() => {
    setForbiddenMessage(null);
  });

  describe('ProtectedRoute', () => {
    it('shows the session bootstrap state', async () => {
      renderGate(<ProtectedRoute />, '/checkout', makeAuthValue({ isBootstrapping: true }), 'checkout', 'Protected target');

      expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Protected target' })).not.toBeInTheDocument();
    });

    it('redirects anonymous users to login', async () => {
      renderGate(<ProtectedRoute />, '/checkout', makeAuthValue(), 'checkout', 'Protected target');

      expect(await screen.findByRole('heading', { name: 'Login target' })).toBeInTheDocument();
    });

    it('allows buyers through', async () => {
      renderGate(<ProtectedRoute />, '/checkout', buyerAuth, 'checkout', 'Protected target');

      expect(await screen.findByRole('heading', { name: 'Protected target' })).toBeInTheDocument();
    });

    it('redirects admins to the admin surface', async () => {
      renderGate(<ProtectedRoute />, '/checkout', adminAuth, 'checkout', 'Protected target');

      expect(await screen.findByRole('heading', { name: 'Admin target' })).toBeInTheDocument();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Buyer pages are not available while you are signed in as an admin. You have been returned to the admin dashboard.',
      );
    });
  });

  describe('CustomerRoute', () => {
    it('shows the session bootstrap state', async () => {
      renderGate(<CustomerRoute />, '/cart', makeAuthValue({ isBootstrapping: true }), 'cart', 'Customer target');

      expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Customer target' })).not.toBeInTheDocument();
    });

    it('allows anonymous users through', async () => {
      renderGate(<CustomerRoute />, '/cart', makeAuthValue(), 'cart', 'Customer target');

      expect(await screen.findByRole('heading', { name: 'Customer target' })).toBeInTheDocument();
    });

    it('allows buyers through', async () => {
      renderGate(<CustomerRoute />, '/cart', buyerAuth, 'cart', 'Customer target');

      expect(await screen.findByRole('heading', { name: 'Customer target' })).toBeInTheDocument();
    });

    it('redirects admins to the admin surface', async () => {
      renderGate(<CustomerRoute />, '/cart', adminAuth, 'cart', 'Customer target');

      expect(await screen.findByRole('heading', { name: 'Admin target' })).toBeInTheDocument();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Buyer pages are not available while you are signed in as an admin. You have been returned to the admin dashboard.',
      );
    });
  });

  describe('AdminRoute', () => {
    it('shows the session bootstrap state', async () => {
      renderGate(<AdminRoute />, '/admin/users', makeAuthValue({ isBootstrapping: true }), 'admin/users', 'Admin users target');

      expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Admin users target' })).not.toBeInTheDocument();
    });

    it('redirects anonymous users to login', async () => {
      renderGate(<AdminRoute />, '/admin/users', makeAuthValue(), 'admin/users', 'Admin users target');

      expect(await screen.findByRole('heading', { name: 'Login target' })).toBeInTheDocument();
    });

    it('redirects buyers to the storefront', async () => {
      renderGate(<AdminRoute />, '/admin/users', buyerAuth, 'admin/users', 'Admin users target');

      expect(await screen.findByRole('heading', { name: 'Storefront target' })).toBeInTheDocument();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The admin dashboard is for operators only. You have been returned to the storefront.',
      );
    });

    it('allows admins through', async () => {
      renderGate(<AdminRoute />, '/admin/users', adminAuth, 'admin/users', 'Admin users target');

      expect(await screen.findByRole('heading', { name: 'Admin users target' })).toBeInTheDocument();
    });
  });

  describe('PublicOnlyRoute', () => {
    it('shows the session bootstrap state', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/checkout', makeAuthValue({ isBootstrapping: true }), 'login', 'Login target');

      expect(await screen.findByLabelText('Loading session...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Login target' })).not.toBeInTheDocument();
    });

    it('allows anonymous users through', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/checkout', makeAuthValue(), 'login', 'Login target');

      expect(await screen.findByRole('heading', { name: 'Login target' })).toBeInTheDocument();
    });

    it('redirects buyers to a safe next path', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/checkout', buyerAuth, 'login', 'Login target');

      expect(await screen.findByRole('heading', { name: 'Checkout target' })).toBeInTheDocument();
    });

    it('redirects admins to a safe admin next path', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/admin/orders', adminAuth, 'login', 'Login target');

      expect(await screen.findByRole('heading', { name: 'Admin orders target' })).toBeInTheDocument();
    });

    it('does not send authenticated buyers back to login or register from next', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/login', buyerAuth, 'login', 'Login target');

      expect(await screen.findByRole('heading', { name: 'Storefront target' })).toBeInTheDocument();
    });

    it('does not send authenticated admins back to login or register from next', async () => {
      renderGate(<PublicOnlyRoute />, '/login?next=/register', adminAuth, 'login', 'Login target');

      expect(await screen.findByRole('heading', { name: 'Admin target' })).toBeInTheDocument();
    });
  });
});

function renderGate(
  gate: ReactElement,
  route: string,
  authValue: AuthContextValue,
  guardedPath: string,
  guardedHeading: string,
) {
  return renderWithProviders(
    <>
      <ForbiddenBanner />
      <Routes>
        <Route element={gate}>
          <Route path={guardedPath} element={<h1>{guardedHeading}</h1>} />
        </Route>
        <Route path="/" element={<h1>Storefront target</h1>} />
        <Route path="/login" element={<h1>Login target</h1>} />
        <Route path="/checkout" element={<h1>Checkout target</h1>} />
        <Route path="/admin" element={<h1>Admin target</h1>} />
        <Route path="/admin/orders" element={<h1>Admin orders target</h1>} />
      </Routes>
    </>,
    { route, authValue },
  );
}
