import { describe, expect, it, vi, beforeEach } from 'vitest';

import * as rateLimitStore from './rate-limit-store';
import testI18n from '../../test/testI18n';

describe('rate-limit-store', () => {
  beforeEach(() => {
    rateLimitStore.setRateLimitState(null);
  });

  it('initially returns null', () => {
    expect(rateLimitStore.getRateLimitState()).toBeNull();
  });

  it('stores and returns rate-limit state', () => {
    rateLimitStore.setRateLimitState({ retryAfterSeconds: 120 });
    expect(rateLimitStore.getRateLimitState()).toEqual({ retryAfterSeconds: 120 });
  });

  it('notifies subscribers on change', () => {
    const listener = vi.fn();
    const unsub = rateLimitStore.subscribe(listener);
    rateLimitStore.setRateLimitState({ retryAfterSeconds: 30 });
    expect(listener).toHaveBeenCalledTimes(1);
    rateLimitStore.setRateLimitState(null);
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });
});

describe('429 rate-limit i18n', () => {
  beforeEach(async () => {
    await testI18n.changeLanguage('en');
  });

  it('resolves rate-limit title in English', () => {
    expect(testI18n.t('errors.rateLimit.title')).toBe('Too many requests');
    expect(testI18n.t('errors.rateLimit.detail')).toBe('Please wait before trying again.');
  });

  it('resolves rate-limit retryAfter with interpolation in English', () => {
    expect(testI18n.t('errors.rateLimit.retryAfter', { seconds: 120 })).toBe('You can retry after 120 seconds.');
  });

  it('resolves rate-limit title in Arabic', async () => {
    await testI18n.changeLanguage('ar');
    expect(testI18n.t('errors.rateLimit.title')).toBe('طلبات كثيرة جدًا');
    expect(testI18n.t('errors.rateLimit.detail')).toBe('انتظر قليلًا قبل المحاولة مرة أخرى.');
  });

  it('resolves rate-limit retryAfter with interpolation in Arabic', async () => {
    await testI18n.changeLanguage('ar');
    expect(testI18n.t('errors.rateLimit.retryAfter', { seconds: 120 })).toBe('يمكنك المحاولة بعد 120 ثانية.');
  });

  it('does not leak raw English into Arabic mode', async () => {
    await testI18n.changeLanguage('ar');
    const title = testI18n.t('errors.rateLimit.title');
    expect(title).not.toContain('Too Many Requests');
    expect(title).not.toContain('Too many requests');
    expect(title).not.toMatch(/Too/i);
  });
});
