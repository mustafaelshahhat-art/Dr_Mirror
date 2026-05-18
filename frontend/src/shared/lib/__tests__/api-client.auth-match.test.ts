import { describe, expect, it } from 'vitest';

import { __isAuthEndpointForTests } from '../api-client';

describe('isAuthEndpoint (anchored exact-suffix matcher)', () => {
  it.each([
    ['/auth/refresh'],
    ['/auth/login'],
    ['/auth/register'],
    ['/auth/logout'],
    ['/api/auth/refresh'],
    ['/api/auth/login?lang=en'],
    ['/api/auth/logout#hash'],
  ])('returns true for legitimate auth path %s', (path) => {
    expect(__isAuthEndpointForTests(path)).toBe(true);
  });

  it.each([
    ['/api/auth-debug-ping'],
    ['/api/orders/auth-info'],
    ['/api/auth/login-history'],
    ['/api/auth/refreshable-token-check'],
    ['/api/auth/loginx'],
    [''],
    ['/cart'],
    ['/products'],
  ])('returns false for substring decoy %s', (path) => {
    expect(__isAuthEndpointForTests(path)).toBe(false);
  });

  it('strips the query string before matching', () => {
    expect(__isAuthEndpointForTests('/api/auth/refresh?cache=0')).toBe(true);
    expect(__isAuthEndpointForTests('/api/auth-debug-ping?next=/auth/refresh')).toBe(false);
  });
});
