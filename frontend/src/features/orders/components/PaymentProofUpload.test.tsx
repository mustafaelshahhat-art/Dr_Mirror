import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import { usePaymentProofUploadConfigQuery, useUploadPaymentProofMutation } from '../hooks';
import { PaymentProofUpload } from './PaymentProofUpload';

vi.mock('../hooks', () => ({
  usePaymentProofUploadConfigQuery: vi.fn(),
  useUploadPaymentProofMutation: vi.fn(),
}));

describe('PaymentProofUpload', () => {
  beforeEach(() => {
    vi.mocked(usePaymentProofUploadConfigQuery).mockReturnValue({
      data: { maxFileSizeBytes: 5 * 1024 * 1024 },
      isError: false,
    } as never);
    vi.mocked(useUploadPaymentProofMutation).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:selected-proof'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('accepts supported image proof files and renders an image preview', async () => {
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    expect(screen.getByText('JPEG, PNG, WebP, HEIC, or HEIF. Maximum 5 MB.')).toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File(['proof-bytes'], 'proof.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('img', { name: "Preview of the file you're about to upload" })).toHaveAttribute(
      'src',
      'blob:selected-proof',
    );
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
  });

  it('uses the server-provided max size in validation and error copy', async () => {
    vi.mocked(usePaymentProofUploadConfigQuery).mockReturnValue({
      data: { maxFileSizeBytes: 2.5 * 1024 * 1024 },
      isError: false,
    } as never);

    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    expect(screen.getByText('JPEG, PNG, WebP, HEIC, or HEIF. Maximum 2.5 MB.')).toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File([new Uint8Array(3 * 1024 * 1024)], 'proof.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('File is larger than 2.5 MB.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects PDF proof files before upload', async () => {
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File(['%PDF-'], 'proof.pdf', { type: 'application/pdf' }),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only JPEG, PNG, WebP, HEIC, and HEIF images are allowed.',
    );
    expect(screen.queryByRole('img', { name: "Preview of the file you're about to upload" })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
