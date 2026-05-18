import { describe, expect, it } from 'vitest';

import { __scrubObjectForTests } from '../sentry';

describe('scrubObject cycle safety', () => {
  it('redacts PII keys and replaces cycles with a sentinel', () => {
    const node: Record<string, unknown> = {
      email: 'someone@example.com',
      phone: '+201001234567',
      address: { line1: '123 Street' },
      label: 'top',
    };
    node.self = node;

    const start = performance.now();
    expect(() => __scrubObjectForTests(node)).not.toThrow();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);

    expect(node.email).toBe('[redacted]');
    expect(node.phone).toBe('[redacted]');
    expect(node.address).toBe('[redacted]');
    expect(node.self).toBe('[circular]');
    expect(node.label).toBe('top');
  });

  it('handles cross-branch cycles without blowing the stack', () => {
    const root: Record<string, unknown> = { left: {}, right: {} };
    const left = root.left as Record<string, unknown>;
    const right = root.right as Record<string, unknown>;
    left.partner = right;
    right.partner = left;

    expect(() => __scrubObjectForTests(root)).not.toThrow();

    expect(left.partner).toBe(right);
    expect(right.partner).toBe('[circular]');
  });

  it('preserves nested PII keys at any depth', () => {
    const root: Record<string, unknown> = {
      user: {
        contact: {
          email: 'leaked@example.com',
          ok: 'untouched',
        },
      },
    };

    __scrubObjectForTests(root);

    const contact = (root.user as { contact: Record<string, unknown> }).contact;
    expect(contact.email).toBe('[redacted]');
    expect(contact.ok).toBe('untouched');
  });

  it('stops at the depth limit (no infinite descent on deep trees)', () => {
    const root: Record<string, unknown> = { level: 0 };
    let cursor = root;
    for (let i = 1; i < 50; i++) {
      const next: Record<string, unknown> = { level: i };
      cursor.child = next;
      cursor = next;
    }

    expect(() => __scrubObjectForTests(root)).not.toThrow();
  });
});
