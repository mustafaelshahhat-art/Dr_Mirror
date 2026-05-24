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
    disable: vi.fn(),
    enable: vi.fn(),
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
    vi.mocked(adminUsersApi.disable).mockReset();
    vi.mocked(adminUsersApi.enable).mockReset();
    toastDangerMock.mockClear();
  });

  it('blocks customer accounts from the dashboard', async () => {
    vi.mocked(adminUsersApi.list).mockResolvedValue({
      items: [
        {
          id: 'user-1',
          fullName: 'Customer User',
          email: 'customer@example.com',
          phoneNumber: null,
          isDisabled: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          roles: ['Buyer'],
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });
    vi.mocked(adminUsersApi.disable).mockResolvedValue({
      id: 'user-1',
      fullName: 'Customer User',
      email: 'customer@example.com',
      phoneNumber: null,
      isDisabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      roles: ['Buyer'],
    });

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    // Customer User appears twice — once in the desktop table, once in the
    // mobile card list — so use findAllByText to wait for data to load.
    expect((await screen.findAllByText('Customer User')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole('button', { name: /block account for customer user/i })[0]);

    expect(adminUsersApi.disable).toHaveBeenCalledWith('user-1');
  });

  it('does not show block controls for admin accounts', async () => {
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

    renderWithProviders(<AdminUsersPage />, { authValue: adminAuth });

    // Only Admin appears twice — once in the desktop table, once in the
    // mobile card list — so use findAllByText to wait for data to load.
    expect((await screen.findAllByText('Only Admin')).length).toBeGreaterThan(0);

    expect(screen.queryByRole('button', { name: /block account for only admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unblock account for only admin/i })).not.toBeInTheDocument();
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
