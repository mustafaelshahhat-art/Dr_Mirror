import { describe, expect, it, vi, beforeEach } from 'vitest';

const toastMocks = vi.hoisted(() => ({
  warning: vi.fn(),
  success: vi.fn(),
  danger: vi.fn(),
  info: vi.fn(),
}));

vi.mock('@heroui/react/toast', () => ({
  toast: toastMocks,
}));

import { CheckoutSuccessNotice, fireAddressSaveOutcomeToast } from '../CheckoutSuccessNotice';
import { renderWithProviders } from '../../../../test/utils';
import testI18n from '../../../../test/testI18n';

describe('CheckoutSuccessNotice', () => {
  beforeEach(() => {
    toastMocks.warning.mockReset();
    toastMocks.success.mockReset();
    toastMocks.danger.mockReset();
    toastMocks.info.mockReset();
  });

  it('fires no toast when outcome is "saved"', () => {
    renderWithProviders(<CheckoutSuccessNotice outcome="saved" />);
    expect(toastMocks.warning).not.toHaveBeenCalled();
  });

  it('fires no toast when outcome is "not_requested"', () => {
    renderWithProviders(<CheckoutSuccessNotice outcome="not_requested" />);
    expect(toastMocks.warning).not.toHaveBeenCalled();
  });

  it('fires no toast when outcome is undefined', () => {
    renderWithProviders(<CheckoutSuccessNotice outcome={undefined} />);
    expect(toastMocks.warning).not.toHaveBeenCalled();
  });

  it('fires a single warning toast when outcome is "skipped_book_full"', () => {
    renderWithProviders(<CheckoutSuccessNotice outcome="skipped_book_full" />);
    expect(toastMocks.warning).toHaveBeenCalledTimes(1);
    const [message, options] = toastMocks.warning.mock.calls[0]!;
    expect(typeof message).toBe('string');
    expect((message as string).length).toBeGreaterThan(0);
    expect((options as { description?: string }).description).toBeDefined();
  });
});

describe('fireAddressSaveOutcomeToast', () => {
  beforeEach(() => {
    toastMocks.warning.mockReset();
  });

  it('returns true and fires toast for skipped_book_full', () => {
    const t = (key: string) => testI18n.t(key);
    expect(fireAddressSaveOutcomeToast('skipped_book_full', t)).toBe(true);
    expect(toastMocks.warning).toHaveBeenCalledTimes(1);
  });

  it('returns false and does not fire for other outcomes', () => {
    const t = (key: string) => testI18n.t(key);
    expect(fireAddressSaveOutcomeToast('saved', t)).toBe(false);
    expect(fireAddressSaveOutcomeToast('not_requested', t)).toBe(false);
    expect(fireAddressSaveOutcomeToast(undefined, t)).toBe(false);
    expect(toastMocks.warning).not.toHaveBeenCalled();
  });
});
