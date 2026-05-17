import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import { PAYMENT_PROOF_STATUS, type PaymentProofDto } from '../types';
import { ordersApi } from '../api';
import { PaymentProofFilePreview } from './PaymentProofFilePreview';

vi.mock('../api', () => ({
  ordersApi: {
    getPaymentProofFile: vi.fn(),
  },
}));

const proof: PaymentProofDto = {
  id: 'proof-1',
  fileUrl: '/uploads/payment-proofs/DM-2026-TEST/proof.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 128,
  status: PAYMENT_PROOF_STATUS.Pending,
  reviewedByUserId: null,
  reviewedByUserName: null,
  reviewedAt: null,
  reviewNote: null,
  uploadedAt: '2026-01-01T00:00:00Z',
};

const labels = {
  loading: 'Loading payment proof image...',
  unavailable: 'Payment proof preview is unavailable.',
  error: "Couldn't load this payment proof image.",
  open: 'Open payment proof file',
};

describe('PaymentProofFilePreview', () => {
  beforeEach(() => {
    vi.mocked(ordersApi.getPaymentProofFile).mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:proof-1'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('loads the protected proof through the API and revokes the object URL', async () => {
    vi.mocked(ordersApi.getPaymentProofFile).mockResolvedValue(
      new Blob(['proof-bytes'], { type: 'image/jpeg' }),
    );

    const { unmount } = renderWithProviders(
      <PaymentProofFilePreview
        orderNumber="DM-2026-TEST"
        proof={proof}
        alt="Payment proof image"
        className="size-16"
        labels={labels}
      />,
    );

    const image = await screen.findByRole('img', { name: 'Payment proof image' });

    expect(ordersApi.getPaymentProofFile).toHaveBeenCalledWith(
      'DM-2026-TEST',
      'proof-1',
      expect.any(AbortSignal),
    );
    expect(image).toHaveAttribute('src', 'blob:proof-1');

    unmount();

    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proof-1');
    });
  });

  it('shows an unavailable state when the authenticated fetch fails', async () => {
    vi.mocked(ordersApi.getPaymentProofFile).mockRejectedValue(new Error('Forbidden'));

    renderWithProviders(
      <PaymentProofFilePreview
        orderNumber="DM-2026-TEST"
        proof={proof}
        alt="Payment proof image"
        className="size-16"
        labels={labels}
      />,
    );

    expect(
      await screen.findByRole('img', { name: "Couldn't load this payment proof image." }),
    ).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
