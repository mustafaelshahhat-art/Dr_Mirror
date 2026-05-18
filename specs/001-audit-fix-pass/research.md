# Research: Audit Fix Pass

**Date**: 2026-05-19
**Branch**: `001-audit-fix-pass`

## R-001: Cache-Control Header Timing in ASP.NET Core

**Decision**: Use `Response.OnStarting` callback to set cache headers before the response body is written.

**Rationale**: The current inline middleware calls `await next()` first, then checks `Response.HasStarted`. For JSON endpoints, the response is already committed by then. The `SecurityHeadersMiddleware` in this project already uses `Response.OnStarting` correctly — we follow the same pattern. `OnStarting` registers a callback that ASP.NET Core invokes just before headers are flushed, guaranteeing the headers are set regardless of when the endpoint writes its body.

**Alternatives considered**:
- **Endpoint filter**: Would require touching every catalog endpoint group. More invasive.
- **Custom middleware class**: More code for the same effect. Inline lambda + `OnStarting` is sufficient and matches existing patterns.
- **IResultFilter**: Not available in Minimal APIs without MVC.

## R-002: Purging Failed Outbox Messages

**Decision**: Extend the existing LINQ query to include `Failed` rows using `LastAttemptAt` as the age timestamp.

**Rationale**: The `EmailOutboxMessage` entity already has `LastAttemptAt` (nullable `DateTimeOffset`). For `Failed` rows, `DeliveredAt` is null, so we use `LastAttemptAt` as the equivalent cutoff check. Rows where `LastAttemptAt` is null should be treated as eligible for purge (they have no useful timestamp to retain them).

**Alternatives considered**:
- **Separate query for Failed rows**: Cleaner but unnecessary — a single `Where` with an OR condition is simpler and generates a single SQL statement.
- **Use `CreatedAt` as fallback**: `LastAttemptAt` is more semantically correct — it reflects when the system last acted on the message.

## R-003: Accurate Purge Count Logging

**Decision**: Maintain an integer counter `purgedCount` that increments only on successful delete, and log that instead of `proofs.Count`.

**Rationale**: Minimal change. The `continue` on failed deletion already skips `FilePurgedAtUtc` assignment, so adding a counter is the natural complement.

**Alternatives considered**:
- **Count non-null `FilePurgedAtUtc` after the loop**: Would work but is less explicit.
- **Remove proofs from the list on failure**: Mutating the collection during enumeration is error-prone.

## R-004: Deterministic Stream Disposal

**Decision**: Move the `using` declaration to the point of `file.OpenReadStream()` creation (line 99), making the stream deterministically disposed from creation through all code paths.

**Rationale**: The existing code has a gap between line 99 (stream creation) and line 114 (where it's passed to `PrefixedStream` with `using`). The explicit `DisposeAsync` on line 107 handles only the magic-bytes failure. A `using` at creation handles all paths. The `PrefixedStream` constructor on line 114 takes ownership but since `using` on the outer stream is a no-op after `PrefixedStream` disposes it (double-dispose is safe on streams), this is correct.

**Alternatives considered**:
- **try/finally wrapping lines 99–114**: More verbose for the same effect.
- **await using var**: Equivalent to `using var` for `Stream` which implements both `IDisposable` and `IAsyncDisposable`.

**Important**: After adding `using var` to the stream, the explicit `await fileStream.DisposeAsync()` on line 107 becomes redundant but harmless (double-dispose is safe). We keep it removed for clarity.

## R-005: react-hook-form + Zod Refactor Pattern

**Decision**: For each form, create a Zod schema inline (or as a module-level const), replace all `useState` calls with `useForm({ resolver: zodResolver(schema), defaultValues })`, and bind fields via `register()` or `Controller` with HeroUI components.

**Rationale**: The project already uses this pattern in Login, Register, and Checkout forms. `react-hook-form` 7.x, `zod` 4.x, and `@hookform/resolvers` 5.x are all already installed in `package.json`.

**Key pattern**:
- HeroUI `TextField` + `Input` with `isRequired`, `isInvalid={!!errors.fieldName}`, `errorMessage={errors.fieldName?.message}`
- `Field` and `TextAreaField` wrappers in `shared/components/Field.tsx` currently accept `value`/`onChange` props. These can be used with `Controller` from react-hook-form, or the forms can use `register()` directly on HeroUI `Input`.
- Forms that reset after successful submit can use `reset()` from useForm.

**Alternatives considered**:
- **Formik**: Not in the project; would violate the convention.
- **Native HTML validation**: Does not provide schema-level cross-field validation or match the convention.

## R-006: eslint-plugin-jsx-a11y Integration

**Decision**: Install `eslint-plugin-jsx-a11y` as a dev dependency and add its recommended config to the flat ESLint config.

**Rationale**: The flat config format (`eslint.config.js`) supports `eslint-plugin-jsx-a11y` via its exported `flatConfigs.recommended` or by manually spreading rules. The plugin's recommended rules cover `img-alt`, `aria-role`, `interactive-supports-focus`, etc.

**Alternatives considered**:
- **Strict mode**: Too aggressive for an existing codebase; recommended is sufficient.
- **Custom rule subset**: Unnecessary complexity when recommended is well-curated.

## R-007: F-006 (Skip-Link) Already Resolved

**Decision**: No work needed. Mark as resolved in the audit punch-list.

**Rationale**: Current code in `Layout.tsx` (lines 19–24) and `AdminLayout.tsx` (lines 16–21) already renders visually-hidden skip-links with `sr-only focus:not-sr-only` classes. The main elements have `id="main-content"` / `id="admin-main"` with `tabIndex={-1}`. The i18n key `common.a11y.skipToContent` is already present. This was likely added after the audit commit (`b30a154`).

## Summary

All unknowns resolved. No NEEDS CLARIFICATION items remain. The implementation is straightforward with well-established patterns already present in the codebase.
