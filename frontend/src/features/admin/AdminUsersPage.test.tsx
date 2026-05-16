import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { AdminUsersPage } from './AdminUsersPage';
import { adminUsersApi } from './users/api';

vi.mock('./users/api', () => ({
  adminUsersApi: {
    list: vi.fn(),
  },
}));

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

const adminAuth = makeAuthValue({
  user: makeAdminUser(),
  isAuthenticated: true,
  isAdmin: true,
});

describe('AdminUsersPage', () => {
  it('renders user roles as read-only badges without role toggle controls', async () => {
    vi.mocked(adminUsersApi.list).mockResolvedValue({
      items: [
        {
          id: 'user-1',
          fullName: 'Admin User',
          email: 'admin@example.com',
          phoneNumber: null,
          isDisabled: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          roles: ['Admin', 'Buyer'],
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Buyer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add role/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove role/i })).not.toBeInTheDocument();
  });
});
