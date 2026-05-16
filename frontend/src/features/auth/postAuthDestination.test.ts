import { describe, expect, it } from 'vitest';

import { makeAdminUser, makeBuyerUser } from '../../test/utils';
import { resolvePostAuthDestination } from './postAuthDestination';

describe('resolvePostAuthDestination', () => {
  it('sends admin with no prior location to /admin', () => {
    expect(resolvePostAuthDestination(makeAdminUser(), null)).toBe('/admin');
  });

  it('sends admin back to an admin path they came from', () => {
    expect(resolvePostAuthDestination(makeAdminUser(), '/admin/orders')).toBe('/admin/orders');
  });

  it('sends admin to /admin even if they came from a storefront path', () => {
    expect(resolvePostAuthDestination(makeAdminUser(), '/cart')).toBe('/admin');
  });

  it('sends buyer with no prior location to /', () => {
    expect(resolvePostAuthDestination(makeBuyerUser(), null)).toBe('/');
  });

  it('sends buyer back to the storefront path they came from', () => {
    expect(resolvePostAuthDestination(makeBuyerUser(), '/checkout')).toBe('/checkout');
  });

  it('sends buyer to / even if they had an admin path (prevents admin bounce)', () => {
    expect(resolvePostAuthDestination(makeBuyerUser(), '/admin/users')).toBe('/');
  });
});
