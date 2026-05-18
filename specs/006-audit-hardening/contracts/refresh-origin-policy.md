# Contract — `/api/auth/refresh` Origin Allowlist Policy

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18 | **Source**: spec FR-003, FR-004 + clarify Q1

This contract specifies the request-acceptance rules for the refresh-token endpoint.

---

## Endpoint

`POST /api/auth/refresh`

No request body. Refresh token rides on the `HttpOnly` cookie set during login.

---

## Decision matrix

| Caller's `Origin` header | Membership of allowlist | Verdict | Status | Body |
|---|---|---|---|---|
| Present, matches an entry | ✓ | **Accept** — proceed to existing rotation | `200 OK` | New access token + sliding refresh cookie (unchanged) |
| Present, does **not** match | ✗ | Reject | `403 Forbidden` | `ProblemDetails` with `title="Untrusted origin"`, `detail="The request origin is not on the trusted-origin allowlist."` |
| Absent (no `Origin` header) | n/a | Reject | `403 Forbidden` | `ProblemDetails` with `title="Missing origin"`, `detail="The Origin request header is required for refresh requests."` |

**Allowlist source**: the same value used by the existing CORS configuration (`Cors:AllowedOrigins` in `appsettings.*.json` / environment variables). Reading from any other source is forbidden.

**Match semantics**: exact case-insensitive comparison of the full `scheme://host[:port]` string, per RFC 6454.

---

## Ordering

The Origin check MUST run **before** the rate-limit policy decrements the refresh counter. This prevents a flood of forged refreshes from consuming a legitimate caller's rate-limit budget.

The Origin check MUST run **before** the existing refresh-token reuse-detection logic. This avoids logging false "reuse" events on attacker-forged inputs that never knew the real cookie value.

---

## What does NOT change

- Refresh-token rotation algorithm (issue new, mark old replaced).
- Sibling-revocation behaviour on detected reuse.
- The rate-limit policy itself (still 30/min/IP).
- The `HttpOnly`, `Secure`, `SameSite`, `Path=/api/auth` cookie attributes.

---

## Verification

| Test | Setup | Expected |
|---|---|---|
| Allowlisted origin → accept | `Origin: https://dr-mirror.com` (or other configured value) | `200 OK`, new tokens |
| Allowlisted second origin → accept | each additional configured origin | `200 OK`, new tokens |
| Non-allowlisted origin → reject | `Origin: https://attacker.example` | `403 Forbidden`, no rotation |
| Missing `Origin` header → reject | header omitted entirely | `403 Forbidden`, no rotation |
| Rejection does NOT consume rate-limit | 100 rejected requests then 1 legitimate refresh | legitimate refresh succeeds |
