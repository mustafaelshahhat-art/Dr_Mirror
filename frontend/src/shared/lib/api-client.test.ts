import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

import { normalizeApiBaseUrl } from './api-client';
import * as authStorage from './auth-storage';
import * as forbiddenStore from './forbidden-store';

describe('normalizeApiBaseUrl', () => {
  it('returns /api for null', () => {
    expect(normalizeApiBaseUrl(null)).toBe('/api');
  });

  it('returns /api for undefined', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe('/api');
  });

  it('returns /api for empty string', () => {
    expect(normalizeApiBaseUrl('')).toBe('/api');
  });

  it('returns /api for whitespace-only string', () => {
    expect(normalizeApiBaseUrl('   ')).toBe('/api');
  });

  it('returns /api for bare /api', () => {
    expect(normalizeApiBaseUrl('/api')).toBe('/api');
  });

  it('returns /api for /api/ with trailing slash', () => {
    expect(normalizeApiBaseUrl('/api/')).toBe('/api');
  });

  it('appends /api to backend origin', () => {
    expect(normalizeApiBaseUrl('http://localhost:5000')).toBe('http://localhost:5000/api');
  });

  it('does not double-append /api', () => {
    expect(normalizeApiBaseUrl('http://localhost:5000/api')).toBe('http://localhost:5000/api');
  });

  it('strips trailing slashes', () => {
    expect(normalizeApiBaseUrl('http://backend/')).toBe('http://backend/api');
  });
});

describe('api-client 401 interceptor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStorage.clearAccessToken();
  });

  it('calls notifyAuthExpired when refresh fails', async () => {
    const notifySpy = vi.spyOn(authStorage, 'notifyAuthExpired').mockImplementation(() => {});
    vi.spyOn(authStorage, 'getAccessToken').mockReturnValue('expired-token');

    const mockAxios = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'));

    const { api } = await import('./api-client');
    try {
      await api.get('/test-endpoint');
    } catch {
      // Expected to reject
    }

    expect(notifySpy).toHaveBeenCalled();
    mockAxios.mockRestore();
  });
});

describe('forbidden-store', () => {
  beforeEach(() => {
    forbiddenStore.setForbiddenMessage(null);
  });

  it('initially returns null', () => {
    expect(forbiddenStore.getForbiddenMessage()).toBeNull();
  });

  it('stores and returns a message', () => {
    forbiddenStore.setForbiddenMessage('Access denied');
    expect(forbiddenStore.getForbiddenMessage()).toBe('Access denied');
  });

  it('notifies subscribers on change', () => {
    const listener = vi.fn();
    const unsub = forbiddenStore.subscribe(listener);

    forbiddenStore.setForbiddenMessage('test');

    expect(listener).toHaveBeenCalledTimes(1);

    forbiddenStore.setForbiddenMessage(null);
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsub = forbiddenStore.subscribe(listener);

    unsub();
    forbiddenStore.setForbiddenMessage('after-unsub');

    expect(listener).not.toHaveBeenCalled();
  });
});
