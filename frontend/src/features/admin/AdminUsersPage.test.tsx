import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { AdminUsersPage } from './AdminUsersPage';
import { adminUsersApi } from './users/api';

const toastDangerMock = vi.hoisted(() => vi.fn());

vi.mock('@heroui/react/toast', () => ({
  toast: { danger: toastDangerMock },
}));

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
    toastDangerMock.mockClear();
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

    // Admin User appears twice — once in the desktop table, once in the
    // mobile card list — so use findAllByText to wait for data to load.
    expect((await screen.findAllByText('Admin User')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('switch', { name: /toggle vendor role/i }));

    expect(adminUsersApi.updateRoles).toHaveBeenCalledWith('user-1', ['Admin', 'Vendor', 'Buyer']);
  });

  it('shows backend role update errors through the shared toast helper', async () => {
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

    // Only Admin appears twice — once in the desktop table, once in the
    // mobile card list — so use findAllByText to wait for data to load.
    expect((await screen.findAllByText('Only Admin')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('switch', { name: /toggle admin role/i }));

    expect(toastDangerMock).toHaveBeenCalledWith('Something went wrong. Please try again.');
    expect(screen.queryByText('At least one admin account must remain active.')).not.toBeInTheDocument();
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
