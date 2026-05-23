import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../../test/utils';
import { AuditLogPage } from './AuditLogPage';
import { adminAuditApi } from './api';

vi.mock('./api', () => ({
  adminAuditApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../cart/api', () => ({
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

const mockEntry = {
  id: 1,
  actorUserId: '00000000-0000-0000-0000-000000000001',
  actorDisplayName: 'Admin User',
  actionType: 'OrderStatusChanged',
  targetEntityType: 'Order',
  targetEntityId: 'ORD-001',
  previousStatus: 'Pending',
  newStatus: 'Paid',
  note: null,
  correlationId: null,
  timestampUtc: '2025-06-01T10:00:00.000Z',
};

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.mocked(adminAuditApi.list).mockReset();
    vi.mocked(adminAuditApi.get).mockReset();
  });

  it('renders audit log entries', async () => {
    vi.mocked(adminAuditApi.list).mockResolvedValue({
      items: [mockEntry],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });

    renderWithProviders(<AuditLogPage />, { authValue: adminAuth });

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.getAllByText('OrderStatusChanged').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when there are no entries', async () => {
    vi.mocked(adminAuditApi.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    });

    renderWithProviders(<AuditLogPage />, { authValue: adminAuth });

    expect(await screen.findByText('No audit entries yet.')).toBeInTheDocument();
  });

  it('shows a retryable error state when loading fails', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAuditApi.list)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        items: [{ ...mockEntry, id: 2, targetEntityId: 'ORD-002' }],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        totalPages: 1,
      });

    renderWithProviders(<AuditLogPage />, { authValue: adminAuth });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the audit log");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(adminAuditApi.list).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Admin User')).toBeInTheDocument();
  });
});
