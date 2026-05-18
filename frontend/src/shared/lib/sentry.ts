import * as Sentry from '@sentry/react';

const PII_KEY_PATTERN = /email|phone|address/i;
const MAX_DEPTH = 10;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE,
    tracesSampleRate: 0,
    beforeSend(event) {
      const seen = new WeakSet<object>();
      scrubObject(event.extra, seen, 0);
      scrubObject(event.contexts, seen, 0);

      for (const breadcrumb of event.breadcrumbs ?? []) {
        scrubObject(breadcrumb.data, seen, 0);
      }

      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
      }

      if (event.request?.url) {
        event.request.url = event.request.url.replace(/\/payment-proofs\/[^?#]+/i, '/payment-proofs/[redacted]');
      }

      return event;
    },
  });
}

function scrubObject(value: unknown, seen: WeakSet<object>, depth: number) {
  if (!value || typeof value !== 'object') return;
  if (depth >= MAX_DEPTH) return;

  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return;
  seen.add(obj);

  for (const key of Object.keys(obj)) {
    if (PII_KEY_PATTERN.test(key)) {
      obj[key] = '[redacted]';
      continue;
    }
    const child = obj[key];
    if (child && typeof child === 'object') {
      if (seen.has(child as object)) {
        obj[key] = '[circular]';
        continue;
      }
      scrubObject(child, seen, depth + 1);
    }
  }
}

// Test-only — exposes the pure scrubber so vitest can call it without bringing
// Sentry's init dependency into the unit test.
export function __scrubObjectForTests(value: unknown): void {
  scrubObject(value, new WeakSet<object>(), 0);
}

export { Sentry };
