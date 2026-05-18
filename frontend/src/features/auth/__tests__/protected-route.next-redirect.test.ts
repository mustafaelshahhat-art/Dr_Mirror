import { describe, expect, it } from 'vitest';

import { getSafeNextPath } from '../ProtectedRoute';

describe('getSafeNextPath', () => {
  it('rejects protocol-relative paths after percent-decoding', () => {
    expect(getSafeNextPath('?next=%2F%2Fevil.com')).toBeNull();
    expect(getSafeNextPath('?next=%2f%2fevil.com')).toBeNull();
  });

  it('rejects double-encoded protocol-relative paths after the URLSearchParams + decodeURIComponent pipeline collapses them', () => {
    // URLSearchParams decodes %25 → % once, then our decodeURIComponent decodes
    // %2F%2F → //, so the final string is "//evil.com" and the leading-//
    // guard rejects it.
    expect(getSafeNextPath('?next=%252F%252Fevil.com')).toBeNull();
  });

  it('rejects raw // protocol-relative paths', () => {
    expect(getSafeNextPath('?next=//evil.com')).toBeNull();
  });

  it('rejects backslash-relative paths', () => {
    expect(getSafeNextPath('?next=%2F%5Cevil.com')).toBeNull();
  });

  it('rejects scheme-with-slashes embedded before any query', () => {
    expect(getSafeNextPath('?next=%2Fevil.com%3A%2F%2Fattacker')).toBeNull();
  });

  it('accepts legitimate paths', () => {
    expect(getSafeNextPath('?next=%2Faccount')).toBe('/account');
    expect(getSafeNextPath('?next=%2Forders%2F123')).toBe('/orders/123');
    expect(getSafeNextPath('?next=%2Faccount%3Fref%3Dfoo')).toBe('/account?ref=foo');
  });

  it('rejects paths that do not start with a single slash', () => {
    expect(getSafeNextPath('?next=evil.com')).toBeNull();
    expect(getSafeNextPath('?next=http%3A%2F%2Fevil.com')).toBeNull();
  });

  it('rejects /login and /register to avoid loops', () => {
    expect(getSafeNextPath('?next=%2Flogin')).toBeNull();
    expect(getSafeNextPath('?next=%2Fregister')).toBeNull();
  });

  it('returns null when ?next is absent', () => {
    expect(getSafeNextPath('')).toBeNull();
    expect(getSafeNextPath('?other=value')).toBeNull();
  });
});
