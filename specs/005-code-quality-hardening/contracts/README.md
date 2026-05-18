# Contracts — none

This feature ships **zero** public HTTP API contract changes:

- No new endpoints.
- No changes to existing endpoint paths, request shapes, response shapes, status codes, or `ProblemDetails` field names.
- No changes to the frontend's `axios` baseURL, headers, or interceptors that would affect what the API sees.

This is enforced by FR-021 in [spec.md](../spec.md) and is checked at the planning gate against Constitution Principle V ("Structural Integrity: Vertical Slices & Feature Folders" — *no production behavior changes unless the user explicitly requested them*).

The directory is preserved (rather than omitted) as part of the standard speckit feature layout so reviewers can confirm at a glance that this audit was conscious.

If a future revision of this feature ever needs to extend the public contract (for example, adding an `errorCode` extension to `ProblemDetails` to replace the title-based lookup in `api-error-map.ts`), the change must come back through `/speckit-specify` with that extension as an explicit out-of-scope-now item promoted into scope.
