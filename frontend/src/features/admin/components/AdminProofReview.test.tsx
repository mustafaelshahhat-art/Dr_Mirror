import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import { ordersApi } from '../../orders/api';
import { PAYMENT_PROOF_STATUS, type PaymentProofDto } from '../../orders/types';
import { useApproveProofMutation, useRejectProofMutation } from '../hooks';
import { AdminProofReview } from './AdminProofReview';

vi.mock('../../orders/api', () => ({
  ordersApi: {
    getPaymentProofFile: vi.fn(),
  },
}));

vi.mock('../hooks', () => ({
  useApproveProofMutation: vi.fn(),
  useRejectProofMutation: vi.fn(),
}));

const proof: PaymentProofDto = {
  id: 'proof-1',
  fileUrl: '/uploads/payment-proofs/DM-2026-TEST/proof.jpg',
  originalFileName: 'receipt:may.png',
  contentType: 'image/png',
  sizeBytes: 128,
  status: PAYMENT_PROOF_STATUS.Pending,
  reviewedByUserId: null,
  reviewedByUserName: null,
  reviewedAt: null,
  reviewNote: null,
  uploadedAt: '2026-01-01T00:00:00Z',
};

describe('AdminProofReview proof files', () => {
  beforeEach(() => {
    vi.mocked(useApproveProofMutation).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never);
    vi.mocked(useRejectProofMutation).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never);
    vi.mocked(ordersApi.getPaymentProofFile).mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn()
        .mockReturnValueOnce('blob:preview')
        .mockReturnValueOnce('blob:download'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('opens previews from Blob URLs and downloads through the authenticated endpoint', async () => {
    const user = userEvent.setup();
    vi.mocked(ordersApi.getPaymentProofFile).mockResolvedValue(
      new Blob(['proof-bytes'], { type: 'image/png' }),
    );
    const realCreateElement = document.createElement.bind(document);
    let downloadAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = realCreateElement(tagName);
      if (tagName === 'a') downloadAnchor = element as HTMLAnchorElement;
      return element;
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithProviders(
      <AdminProofReview orderNumber="DM-2026-TEST" proofs={[proof]} />,
    );

    await screen.findByRole('img', { name: 'Payment proof image' });
    const previewLink = screen.getByRole('link', { name: 'Open payment proof file' });
    expect(previewLink).toHaveAttribute('href', 'blob:preview');
    expect(previewLink).not.toHaveAttribute('href', proof.fileUrl);

    await user.click(screen.getByRole('button', { name: /download proof/i }));

    await waitFor(() => {
      expect(ordersApi.getPaymentProofFile).toHaveBeenCalledTimes(2);
    });
    expect(ordersApi.getPaymentProofFile).toHaveBeenLastCalledWith('DM-2026-TEST', 'proof-1');
    expect(downloadAnchor).not.toBeNull();
    expect(downloadAnchor).toHaveAttribute('href', 'blob:download');
    expect(downloadAnchor).toHaveAttribute('download', 'receipt-may.png');
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });

  it('uses explicit admin transition action labels for approve and reject buttons', async () => {
    vi.mocked(ordersApi.getPaymentProofFile).mockResolvedValue(
      new Blob(['proof-bytes'], { type: 'image/png' }),
    );

    renderWithProviders(
      <AdminProofReview orderNumber="DM-2026-TEST" proofs={[proof]} />,
    );

    expect(await screen.findByRole('button', { name: /approve payment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject payment proof/i })).toBeInTheDocument();
  });
});
