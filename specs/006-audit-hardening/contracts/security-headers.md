# Contract — Baseline Security Headers

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18 | **Source**: spec FR-001, FR-002 + clarify Q2

This contract defines the exact response-header set that the API MUST emit on every response, in every environment.

---

## Header set

| Header | Value (production HTTPS) | Value (dev / non-HTTPS) | Notes |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | *(omitted)* | Per Clarify Q2: no `preload`. Omitted on non-HTTPS responses per RFC 6797 §7.2. |
| `X-Content-Type-Options` | `nosniff` | `nosniff` | Always. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` | Configurable, no looser. |
| `X-Frame-Options` | `DENY` | `DENY` | The site is a credentialed app, never embedded. |
| `Cross-Origin-Resource-Policy` | `same-site` | `same-site` | Mitigates Spectre/XS-Leaks for credentialed responses. |

## Applies to

- Every response from every route prefix (`/api/...`, `/uploads/...`, `/health/...`).
- Every status code class: 2xx, 3xx, 4xx, 5xx.
- Streaming responses (payment-proof download): the middleware uses `Response.OnStarting` so headers are attached **before** the body begins streaming.
- Rate-limit rejections (429) and `ProblemDetails` validation errors (400/422).

## Does NOT apply to

- Connections that bypass the API entirely (e.g., direct Cloudinary URLs for public marketing images). Those are managed at the asset CDN; out of scope for this feature.

## Verification

A pass-the-bar check is:

```bash
curl -i https://<api>/api/health/live | grep -E "^(Strict-Transport-Security|X-Content-Type-Options|Referrer-Policy|X-Frame-Options|Cross-Origin-Resource-Policy):"
```

must return exactly five matching lines.

For programmatic verification, `Mozilla Observatory` against the API base URL MUST return a **B+ or better** with all five headers green.
