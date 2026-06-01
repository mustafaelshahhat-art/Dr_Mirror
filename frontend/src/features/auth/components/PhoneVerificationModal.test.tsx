import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import type { SendOtpResponse, VerifyOtpResponse } from '../api';
import { PhoneVerificationModal } from './PhoneVerificationModal';

function makeProps() {
  return {
    sendOtp: vi
      .fn<(input?: { phone?: string }) => Promise<SendOtpResponse>>()
      .mockResolvedValue({ sessionId: 'sess-1', status: 'sent', maskedPhone: '01*****89' }),
    verifyOtp: vi
      .fn<(input: { code: string; sessionId: string }) => Promise<VerifyOtpResponse>>()
      .mockResolvedValue({ verified: true }),
    onVerified: vi.fn<() => void>(),
  };
}

type HarnessProps = ReturnType<typeof makeProps>;

/**
 * Renders the modal closed first, then opens it — mirroring real usage where
 * both Checkout and Account toggle `isOpen` after the modal has mounted. A
 * "Toggle" button flips it open so the open transition (and auto-send) fires.
 */
function Harness(props: HarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open-modal
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        close-modal
      </button>
      <PhoneVerificationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        maskedPhone="01*****89"
        sendOtp={props.sendOtp}
        verifyOtp={props.verifyOtp}
        onVerified={props.onVerified}
      />
    </>
  );
}

describe('PhoneVerificationModal (shared OTP flow)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('auto-sends the OTP exactly once on open', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps();
    renderWithProviders(<Harness {...props} />);

    await user.click(screen.getByText('open-modal'));

    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(1));
    // No phone override on auto-send (phone already on file).
    expect(props.sendOtp).toHaveBeenCalledWith(undefined);
  });

  it('verifies on submit and never resends from the verify action', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps();
    renderWithProviders(<Harness {...props} />);

    await user.click(screen.getByText('open-modal'));
    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(1));

    const input = await screen.findByLabelText('Verification code');
    await user.type(input, '123456');

    const verifyBtn = screen.getByRole('button', { name: 'Verify' });
    await user.click(verifyBtn);

    await waitFor(() =>
      expect(props.verifyOtp).toHaveBeenCalledWith({ code: '123456', sessionId: 'sess-1' }),
    );
    expect(props.onVerified).toHaveBeenCalledTimes(1);
    // The verify action must not have triggered any additional send.
    expect(props.sendOtp).toHaveBeenCalledTimes(1);
  });

  it('pressing Enter in the code field verifies (does not resend)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps();
    renderWithProviders(<Harness {...props} />);

    await user.click(screen.getByText('open-modal'));
    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(1));

    const input = await screen.findByLabelText('Verification code');
    await user.type(input, '654321{Enter}');

    await waitFor(() =>
      expect(props.verifyOtp).toHaveBeenCalledWith({ code: '654321', sessionId: 'sess-1' }),
    );
    expect(props.sendOtp).toHaveBeenCalledTimes(1);
  });

  it('disables resend during the countdown and shows the remaining seconds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps();
    renderWithProviders(<Harness {...props} />);

    await user.click(screen.getByText('open-modal'));
    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(1));

    // Right after the send the resend button is disabled and shows a countdown.
    const resendBtn = await screen.findByRole('button', { name: /Resend code in \d+s/ });
    expect(resendBtn).toBeDisabled();
  });

  it('reopening the modal does not cause duplicate auto-sends', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps();
    renderWithProviders(<Harness {...props} />);

    await user.click(screen.getByText('open-modal'));
    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('close-modal'));
    await user.click(screen.getByText('open-modal'));

    // Second open triggers exactly one more auto-send (two total), never a burst.
    await waitFor(() => expect(props.sendOtp).toHaveBeenCalledTimes(2));
  });
});
