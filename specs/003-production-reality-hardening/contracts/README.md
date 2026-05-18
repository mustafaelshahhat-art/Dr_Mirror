# Contracts — Full-Stack Production Reality Hardening

This folder documents the **interfaces** this feature changes or adds. Dr Mirror exposes three classes of interface:

1. **HTTP API** consumed by the SPA and any future client — see [`api-changes.md`](./api-changes.md).
2. **Admin audit log** queryable by admins — see [`audit-log.md`](./audit-log.md).
3. **Operational interfaces** (health probes, runbook) used by hosting platforms and on-call operators — see [`health.md`](./health.md) and [`runbook.md`](./runbook.md).

Each contract file lists: what changes, the wire format, status codes, examples, and backward-compatibility notes.

## Backward compatibility

This feature is a hardening pass. The following are guaranteed:

- No existing endpoint URL or method is removed.
- No existing successful response shape is reduced or renamed (additive only).
- New required request fields are introduced **only** behind a feature path that did not previously enforce them (e.g., `X-Idempotency-Key` is *recommended* and *backwards-compatible* — its absence still produces a working order, but loses double-submit protection).
- New error responses (e.g., 413 for oversize proof, 415 for wrong type, 410 for purged proof file) fit the existing RFC 7807 ProblemDetails shape and carry localized `title`/`detail`.
- Existing rate-limit policies and CORS allowlist semantics are unchanged.

## Production behavior preservation

Per Constitution Principle I, IV and spec NG-7 / AC-12:

- Eight-state order lifecycle: unchanged.
- COD vs Instapay/Wallet proof rules: unchanged.
- Proof approve/reject admin flow: unchanged.
- Last-admin guard: preserved.
- Stale-proof guard: preserved.
