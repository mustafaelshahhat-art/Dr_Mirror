import * as Sentry from '@sentry/react';

const PII_KEY_PATTERN = /email|phone|address/i;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE,
    tracesSampleRate: 0,
    beforeSend(event) {
      scrubObject(event.extra);
      scrubObject(event.contexts);

      for (const breadcrumb of event.breadcrumbs ?? []) {
        scrubObject(breadcrumb.data);
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

function scrubObject(value: unknown) {
  if (!value || typeof value !== 'object') return;

  for (const key of Object.keys(value as Record<string, unknown>)) {
    const record = value as Record<string, unknown>;
    if (PII_KEY_PATTERN.test(key)) {
      record[key] = '[redacted]';
      continue;
    }
    scrubObject(record[key]);
  }
}

export { Sentry };
