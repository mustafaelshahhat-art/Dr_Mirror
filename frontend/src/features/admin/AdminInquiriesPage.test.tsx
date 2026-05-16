import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../test/utils';
import { inquiriesApi } from '../inquiries/api';
import { AdminInquiriesPage } from './AdminInquiriesPage';

vi.mock('../inquiries/api', () => ({
  inquiriesApi: {
    adminList: vi.fn(),
    adminMarkRead: vi.fn(),
    adminMarkResponded: vi.fn(),
    submit: vi.fn(),
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

describe('AdminInquiriesPage', () => {
  it('shows a retryable error state when inquiries fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(inquiriesApi.adminList)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
      });

    renderWithProviders(<AdminInquiriesPage />, { authValue: adminAuth });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load inquiries");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No inquiries yet.')).toBeInTheDocument();
    expect(inquiriesApi.adminList).toHaveBeenCalledTimes(2);
  });
});
