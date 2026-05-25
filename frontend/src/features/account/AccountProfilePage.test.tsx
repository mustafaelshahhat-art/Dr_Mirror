import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../../test/utils';
import { AccountProfilePage } from './AccountProfilePage';
import type { AccountProfileDto } from './types';

const accountApiMock = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  sendOtp: vi.fn(),
  getOtpSendStatus: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('./api', () => ({
  accountApi: accountApiMock,
}));

function makeProfile(overrides: Partial<AccountProfileDto> = {}): AccountProfileDto {
  return {
    fullName: 'Buyer User',
    email: 'buyer@example.com',
    phoneNumber: '01012345678',
    phoneVerified: false,
    phoneVerifiedAt: null,
    ...overrides,
  };
}

function renderPage() {
  return renderWithProviders(<AccountProfilePage />, {
    route: '/account/profile',
    authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }),
  });
}

describe('AccountProfilePage phone verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountApiMock.getProfile.mockResolvedValue(makeProfile());
    accountApiMock.updateProfile.mockImplementation(async (input: { fullName?: string; phoneNumber?: string }) => makeProfile({
      fullName: input.fullName ?? 'Buyer User',
      phoneNumber: input.phoneNumber ?? '01012345678',
      phoneVerified: false,
      phoneVerifiedAt: null,
    }));
    accountApiMock.sendOtp.mockResolvedValue({
      sessionId: '11111111-1111-1111-1111-111111111111',
      maskedPhone: '010*****678',
      cooldownSeconds: 60,
      resendsRemaining: 3,
      status: 'sent',
    });
    accountApiMock.getOtpSendStatus.mockResolvedValue({
      status: 'sent',
      message: 'Verification code sent via WhatsApp.',
      canRetry: false,
    });
    accountApiMock.verifyOtp.mockResolvedValue({ verified: true });
  });

  it('shows the OTP form immediately while the WhatsApp send is pending', async () => {
    const user = userEvent.setup();
    let resolveSend!: (value: unknown) => void;
    accountApiMock.sendOtp.mockReturnValueOnce(new Promise((resolve) => {
      resolveSend = resolve;
    }));
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));

    expect(screen.getByTestId('otp-form')).toBeInTheDocument();
    expect(screen.getByText("We're sending your verification code on WhatsApp...")).toBeInTheDocument();

    resolveSend({
      sessionId: '22222222-2222-2222-2222-222222222222',
      maskedPhone: '010*****678',
      cooldownSeconds: 60,
      resendsRemaining: 3,
      status: 'sent',
    });
    await waitFor(() => expect(screen.getByText('Verification code sent via WhatsApp.')).toBeInTheDocument());
  });

  it('keeps the OTP form visible with retry UI when WhatsApp send fails', async () => {
    const user = userEvent.setup();
    accountApiMock.sendOtp.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { code: 'WhatsAppUnavailable' } },
    });
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));

    expect(await screen.findByTestId('otp-form')).toBeInTheDocument();
    expect(await screen.findByText('Could not send the code. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeEnabled();
  });

  it('renders the OTP form outside the profile form', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('01012345678');
    const profileForm = screen.getByLabelText('Full name').closest('form');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));

    const otpForm = await screen.findByTestId('otp-form');
    expect(profileForm).not.toBeNull();
    expect(profileForm!).not.toContainElement(otpForm);
    expect(otpForm.closest('form')).toBe(otpForm);
  });

  it('submitting the OTP does not save the profile or append code to the URL', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));
    const otpForm = await screen.findByTestId('otp-form');

    await user.type(within(otpForm).getByLabelText('6-digit code'), '123456');
    await user.click(within(otpForm).getByRole('button', { name: /^verify phone$/i }));

    await waitFor(() => expect(accountApiMock.verifyOtp).toHaveBeenCalledWith('profile', '123456'));
    expect(accountApiMock.updateProfile).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('does not hide an active OTP form on window focus', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));
    expect(await screen.findByTestId('otp-form')).toBeInTheDocument();

    fireEvent.focus(window);

    expect(screen.getByTestId('otp-form')).toBeInTheDocument();
    expect(accountApiMock.getProfile).toHaveBeenCalledTimes(1);
  });

  it('keeps an active OTP session after saving unchanged phone profile data', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));
    expect(await screen.findByTestId('otp-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^save profile$/i }));

    await waitFor(() => expect(accountApiMock.updateProfile).toHaveBeenCalled());
    expect(screen.getByTestId('otp-form')).toBeInTheDocument();
  });

  it('disables WhatsApp verification while phone changes are unsaved', async () => {
    const user = userEvent.setup();
    renderPage();

    const phoneInput = await screen.findByLabelText('Mobile phone');
    await user.clear(phoneInput);
    await user.type(phoneInput, '01112345678');

    expect(screen.getByText('Save your phone number first to verify it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify via whatsapp/i })).toBeDisabled();
    expect(accountApiMock.sendOtp).not.toHaveBeenCalled();
  });

  it('keeps the OTP form visible after a wrong code', async () => {
    const user = userEvent.setup();
    accountApiMock.verifyOtp.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { code: 'InvalidOtpCode', attemptsRemaining: 2 } },
    });
    renderPage();

    await screen.findByDisplayValue('01012345678');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));
    const otpForm = await screen.findByTestId('otp-form');

    await user.type(within(otpForm).getByLabelText('6-digit code'), '111111');
    await user.click(within(otpForm).getByRole('button', { name: /^verify phone$/i }));

    expect(await screen.findByText('Incorrect code. 2 attempts remaining.')).toBeInTheDocument();
    expect(screen.getByTestId('otp-form')).toBeInTheDocument();
    expect(accountApiMock.updateProfile).not.toHaveBeenCalled();
  });

  it('refreshes profile state and updates the badge after correct verification', async () => {
    const user = userEvent.setup();
    let verified = false;
    accountApiMock.getProfile.mockImplementation(async () => makeProfile({
      phoneVerified: verified,
      phoneVerifiedAt: verified ? '2026-05-25T10:00:00Z' : null,
    }));
    accountApiMock.verifyOtp.mockImplementation(async () => {
      verified = true;
      return { verified: true };
    });
    renderPage();

    await screen.findByText('Unverified');
    await user.click(screen.getByRole('button', { name: /verify via whatsapp/i }));
    const otpForm = await screen.findByTestId('otp-form');

    await user.type(within(otpForm).getByLabelText('6-digit code'), '123456');
    await user.click(within(otpForm).getByRole('button', { name: /^verify phone$/i }));

    await waitFor(() => expect(screen.queryByTestId('otp-form')).not.toBeInTheDocument());
    expect(await screen.findByText('Verified')).toBeInTheDocument();
  });
});
