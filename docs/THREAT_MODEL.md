# Threat Model

STRIDE-oriented threat model for checkout, payment-proof review, admin catalog editing, and user-role management.

## Trust Boundaries

- Browser to API over HTTPS.
- API to SQL Server.
- API to Cloudinary or local storage.
- API to SMTP provider.
- Admin role boundary between operators and buyers.

## Checkout

- Spoofing: authenticate buyer before order creation.
- Tampering: recompute totals server-side and decrement stock in a transaction.
- Repudiation: correlate order creation and admin status changes with logs/audit.
- Information disclosure: buyer order reads are ownership-filtered.
- Denial of service: rate limits and idempotency keys reduce duplicate submits.
- Elevation of privilege: buyer tokens never reach admin mutation endpoints.

## Payment-Proof Review

- Spoofing: proof file access requires authenticated owner or admin.
- Tampering: server validates content length, declared MIME, and magic bytes.
- Information disclosure: proof files are not served by static-file middleware.
- Repudiation: approve/reject actions are audited.

## Admin Catalog Editing

- Tampering: validation rejects bad slugs, prices, stock, and image uploads.
- Repudiation: product/category/stock mutations are audited.
- Denial of service: admin pages are paginated and indexed.

## User Role Management

- Elevation of privilege: profile update binds only buyer-editable fields.
- Tampering: role changes require Admin role and preserve the last-admin guard.
- Repudiation: role, enable, and disable changes are audited.
