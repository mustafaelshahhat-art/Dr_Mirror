import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { AdminUsersPage } from './AdminUsersPage';
import { adminUsersApi } from './users/api';

vi.mock('./users/api', () => ({
  adminUsersApi: {
    list: vi.fn(),
    updateRoles: vi.fn(),
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
  beforeEach(() => {
    vi.mocked(adminUsersApi.list).mockReset();
    vi.mocked(adminUsersApi.updateRoles).mockReset();
  });

  it('updates user roles from the dashboard', async () => {
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
    vi.mocked(adminUsersApi.updateRoles).mockResolvedValue({
      id: 'user-1',
      fullName: 'Admin User',
      email: 'admin@example.com',
      phoneNumber: null,
      isDisabled: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      roles: ['Admin', 'Buyer', 'Vendor'],
    });

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /toggle vendor role/i }));

    expect(adminUsersApi.updateRoles).toHaveBeenCalledWith('user-1', ['Admin', 'Vendor', 'Buyer']);
  });

  it('shows backend role update errors including the last-admin guard', async () => {
    vi.mocked(adminUsersApi.list).mockResolvedValue({
      items: [
        {
          id: 'user-1',
          fullName: 'Only Admin',
          email: 'admin@example.com',
          phoneNumber: null,
          isDisabled: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          roles: ['Admin'],
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });
    vi.mocked(adminUsersApi.updateRoles).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          title: 'Cannot remove the last admin',
          detail: 'At least one admin account must remain active.',
        },
      },
    });

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    expect(await screen.findByText('Only Admin')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /toggle admin role/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'At least one admin account must remain active.',
    );
  });

  it('shows a retryable error state when users fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(adminUsersApi.list)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
      });

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load users");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No users found.')).toBeInTheDocument();
    expect(adminUsersApi.list).toHaveBeenCalledTimes(2);
  });
});
