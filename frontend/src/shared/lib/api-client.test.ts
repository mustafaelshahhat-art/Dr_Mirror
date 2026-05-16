import { describe, expect, it } from 'vitest';

import { normalizeApiBaseUrl } from './api-client';

describe('normalizeApiBaseUrl', () => {
  it('falls back to /api for missing or blank values', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe('/api');
    expect(normalizeApiBaseUrl(null)).toBe('/api');
    expect(normalizeApiBaseUrl('   ')).toBe('/api');
  });

  it('preserves an explicit /api base path', () => {
    expect(normalizeApiBaseUrl('/api')).toBe('/api');
    expect(normalizeApiBaseUrl('/api/')).toBe('/api');
  });

  it('adds /api to deployed backend origins', () => {
    expect(normalizeApiBaseUrl('https://api.drmirror.com')).toBe('https://api.drmirror.com/api');
    expect(normalizeApiBaseUrl('https://api.drmirror.com/')).toBe('https://api.drmirror.com/api');
  });

  it('does not duplicate /api on absolute URLs', () => {
    expect(normalizeApiBaseUrl('https://api.drmirror.com/api')).toBe('https://api.drmirror.com/api');
    expect(normalizeApiBaseUrl('https://api.drmirror.com/api/')).toBe('https://api.drmirror.com/api');
  });
});
