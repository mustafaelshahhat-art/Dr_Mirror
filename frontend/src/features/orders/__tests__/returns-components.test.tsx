import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import testI18n from '../../../test/testI18n';
import { ReturnRequestCard } from '../components/ReturnRequestCard';
import { ReturnStatusBadge } from '../components/ReturnStatusBadge';
import { SubmitReturnDialog } from '../components/SubmitReturnDialog';
import { RETURN_STATUSES, type ReturnRequestDto } from '../types';
import { useCancelReturnMutation, useSubmitReturnMutation } from '../hooks';

vi.mock('../hooks', () => ({
  useCancelReturnMutation: vi.fn(),
  useSubmitReturnMutation: vi.fn(),
}));

const requestedReturn: ReturnRequestDto = {
  id: 'return-1',
  orderNumber: 'DM-RET-1',
  status: RETURN_STATUSES.Requested,
  customerReason: 'Wrong size',
  adminNote: null,
  createdAt: '2026-05-24T00:00:00Z',
  updatedAt: '2026-05-24T00:00:00Z',
  reviewedAt: null,
  receivedAt: null,
  completedAt: null,
  cancelledAt: null,
  items: [{
    id: 'item-1',
    nameAr: 'سكراب',
    nameEn: 'Scrub',
    sku: 'SCR-1',
    size: 'M',
    colorName: 'Blue',
    colorNameAr: 'أزرق',
    colorHex: '#1e40af',
    primaryImageUrl: null,
    unitPrice: 350,
    quantity: 2,
  }],
};

afterEach(() => cleanup());

beforeEach(async () => {
  await testI18n.changeLanguage('en');
  vi.mocked(useCancelReturnMutation).mockReturnValue({
    isPending: false,
    mutate: vi.fn(),
  } as never);
  vi.mocked(useSubmitReturnMutation).mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as never);
});

describe('returns components', () => {
  it('renders every return status label', () => {
    for (const status of Object.values(RETURN_STATUSES)) {
      const { unmount } = renderWithProviders(<ReturnStatusBadge status={status} />);
      expect(screen.getByText(new RegExp(status, 'i'))).toBeInTheDocument();
      unmount();
    }
  });

  it('shows the cancel button only for requested returns', () => {
    const { rerender } = renderWithProviders(
      <ReturnRequestCard orderNumber="DM-RET-1" request={requestedReturn} lang="en" />,
    );

    expect(screen.getByRole('button', { name: 'Cancel return request' })).toBeInTheDocument();

    rerender(
      <ReturnRequestCard
        orderNumber="DM-RET-1"
        request={{ ...requestedReturn, status: RETURN_STATUSES.Approved }}
        lang="en"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Cancel return request' })).not.toBeInTheDocument();
  });

  it('shows a Zod error when submitting an empty return reason', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubmitReturnDialog orderNumber="DM-RET-1" />);

    await user.click(screen.getByRole('button', { name: 'Submit return request' }));
    await user.click(screen.getAllByRole('button', { name: 'Submit return request' }).at(-1)!);

    expect(await screen.findByText('Enter a return reason.')).toBeInTheDocument();
  });
});
