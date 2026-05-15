# Contract — Admin API Authorization Invariants

**Feature**: Admin / Customer Separation & Production Polish
**Surface**: `backend/src/DrMirror.Api/Features/Admin/*` (existing) +
`backend/tests/DrMirror.Tests/Security/AdminRoleRoutingTests.cs` (new fixture).

## 1. Invariant under test

> Every endpoint mounted via `MapAdminEndpoints` on the application's `IEndpointRouteBuilder`
> MUST carry an authorization policy that requires the `Admin` role.

This guarantees that adding a new admin endpoint in the future cannot accidentally ship
without `RequireRole(Admin)`. The client routing change in this feature is a UX layer; this
invariant is the source of truth for access control.

## 2. Test fixture (new)

Location: `backend/tests/DrMirror.Tests/Security/AdminRoleRoutingTests.cs`

Approach: spin up the application factory (`WebApplicationFactory<Program>`), resolve the
`EndpointDataSource`, walk every endpoint whose route pattern starts with `/api/admin/`, and
assert that the endpoint metadata contains an `AuthorizeAttribute` (or policy) requiring the
`Admin` role.

**Test cases**

| # | Assertion | Pass criterion |
| --- | --- | --- |
| AR-T1 | Every endpoint with route prefix `/api/admin/` requires authorization. | The endpoint metadata contains `IAuthorizeData`. |
| AR-T2 | Every such endpoint requires the `Admin` role. | The authorize metadata names the `Admin` role (via `Roles = "Admin"` or a named policy that maps to it). |
| AR-T3 | No endpoint outside `/api/admin/` carries an Admin-only requirement by accident. | Endpoints whose route prefix is not `/api/admin/` do NOT carry an Admin-only authorize attribute (low-risk safety net; if it ever fails, surface for review). |

These tests run on the in-memory test host using the existing `WebApplicationFactory` pattern
already established for backend security tests (`AdminActorGuardTests`,
`UserRoleSecurityTests`, `OrderOwnershipTests`).

## 3. Response shape contract (unchanged; verified)

For any authenticated user without the Admin role calling `/api/admin/*`:

- HTTP status: `403 Forbidden`.
- Response body: RFC 7807 `ProblemDetails` shape:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.4",
  "title": "Forbidden",
  "status": 403,
  "detail": "<server-provided message>",
  "instance": "/api/admin/<segment>"
}
```

For any anonymous user calling `/api/admin/*`:

- HTTP status: `401 Unauthorized`.
- Response body: empty or minimal `ProblemDetails`; client treats this as "session expired,
  send to `/login`".

These shapes are already produced by the existing pipeline; this contract records them so the
SPA's 403 handler (FR-015) can rely on them.

## 4. SPA 403 handler contract (NEW small surface)

When an authenticated user receives `403` from any `/api/admin/*` request:

- The axios response interceptor MUST distinguish `403` from `401`.
- For `403`, the SPA MUST surface a non-modal banner with a friendly "Not authorized" message
  in the active locale.
- For `403` on a route the user is currently inside, the SPA MUST navigate the user away from
  that admin route (back to `/admin` if they still hold the Admin role; back to `/` if their
  role was revoked mid-session).
- Existing `401` behavior is unchanged: the api-client's `setAuthExpiredHandler` fires and
  the user is dropped to `/login`.

## 5. Non-goals

- This contract does NOT introduce a new endpoint, a new policy, or a new response shape.
- It does NOT change rate-limiting rules. A conservative rate-limit on `/api/admin/*` is a
  separate polish item recorded in `research.md` §2.4 and will land alongside the test
  fixture; the contract for *that* polish item is captured at PR time, not here.
