import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import testI18n from '../../../test/testI18n';
import { usePaymentProofUploadConfigQuery, useUploadPaymentProofMutation } from '../hooks';
import { PaymentProofUpload } from './PaymentProofUpload';

vi.mock('../hooks', () => ({
  usePaymentProofUploadConfigQuery: vi.fn(),
  useUploadPaymentProofMutation: vi.fn(),
}));

describe('PaymentProofUpload', () => {
  beforeEach(() => {
    void testI18n.changeLanguage('en');
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

    expect(screen.getByText('JPEG, PNG, or PDF. Maximum 5 MB.')).toBeInTheDocument();

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

    expect(screen.getByText('JPEG, PNG, or PDF. Maximum 2.5 MB.')).toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File([new Uint8Array(3 * 1024 * 1024)], 'proof.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('File is larger than 2.5 MB.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects a 6 MB file client-side in English', async () => {
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File([new Uint8Array(6 * 1024 * 1024)], 'proof.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('File is larger than 5 MB.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('rejects a 6 MB file client-side in Arabic', async () => {
    await testI18n.changeLanguage('ar');
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    await userEvent.upload(
      screen.getByLabelText('اختر ملف'),
      new File([new Uint8Array(6 * 1024 * 1024)], 'proof.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('حجم الملف أكبر من 5 ميجابايت.');
    expect(screen.getByRole('button', { name: 'رفع' })).toBeDisabled();
  });

  it('rejects an exe file even if the picker accept filter is bypassed', async () => {
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File(['MZ'], 'proof.exe', { type: 'application/x-msdownload' }),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Only JPEG, PNG, or PDF files are allowed.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('accepts PDF proof files without rendering an image preview', async () => {
    renderWithProviders(<PaymentProofUpload orderNumber="DM-2026-TEST" />);

    await userEvent.upload(
      screen.getByLabelText('Choose a file'),
      new File(['%PDF-'], 'proof.pdf', { type: 'application/pdf' }),
      { applyAccept: false },
    );

    expect(screen.queryByRole('img', { name: "Preview of the file you're about to upload" })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
