import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { Header } from './Header';

// Prevent CartProvider from making real HTTP calls during these unit tests.
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

describe('Header', () => {
  it('returns null for admin users — no banner element is rendered', () => {
    renderWithProviders(<Header />, {
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders the sign-in link for anonymous (non-admin, no user) visitors', () => {
    renderWithProviders(<Header />, {
      authValue: makeAuthValue(),
    });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });
});
