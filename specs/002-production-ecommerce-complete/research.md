# Research: Production-Ready E-Commerce Platform

**Phase**: 0 — Unknowns Resolution  
**Feature**: 002-production-ecommerce-complete  
**Date**: 2026-05-15

---

## 1. Current Implementation State (Codebase Audit)

### Decision: What is already complete?

**Backend — fully implemented (M1–M3):**
- Auth: register, login, logout, JWT refresh with rotation + httpOnly cookie
- Catalog: public product list (paginated, filterable by category/gender/size/color/price/sort), product detail by slug, category list
- Cart: guest (localStorage) + server cart, merge on sign-in, add/update/remove/clear
- Checkout: address capture, payment method selection, order creation, COD / proof-required flow
- Orders (buyer): list, detail, cancel (buyer-initiated), upload payment proof
- Admin: full CRUD for categories, products (+ variants + images), payment methods, inquiries (list + mark-read), orders (list + detail + transition + proof approve/reject), users (list + role update)
- Email: queued via Coravel — confirmation, payment-review-needed, status-changed
- File storage: local (dev) + Cloudinary (prod) with MIME validation
- Security: AdminRoleRoutingTests (xUnit) meta-test, rate limiting on admin group, JWT 401/403, forbidden-store SPA banner

**Frontend — fully implemented:**
- Auth: login, register, AuthProvider, ProtectedRoute / AdminRoute / CustomerRoute / PublicOnlyRoute, postAuthDestination redirect helper
- Admin shell: AdminLayout, AdminSidebar, AdminHeader
- All admin pages: Hub, Orders list, Order detail (proof approve/reject), Categories, Products list/create/edit, Payment Methods, Inquiries, Users
- Customer shell: Layout, Header, CartButton (controlled, no nested button)
- Storefront: CatalogPage, ProductDetailPage (variant picker, add-to-cart), CartPage, CheckoutPage, OrderDetailPage, OrdersListPage, AddressBookPage
- Cart: CartProvider (guest+server), CartButton drawer, CartLineRow
- i18n: ar + en namespaces for all existing pages
- Theme: dark/light via next-themes, ThemeToggle, LangSwitcher
- RTL: logical classes used in most components

**Rationale:** The project is at approximately M3-complete with M4 work (admin CRUD UIs) partially done. The production-readiness spec covers gap-closure across UI polish, RTL parity audit, pre-existing test failures, and remaining open items from `PROJECT_MAP.md [ORPHANS & PENDING]`.

---

## 2. Pre-Existing Test Failures (Must Fix)

### Decision: Root cause of two failing unit tests

**Failure 1 — `PaymentProofTests.Reject_transitions_PendingPaymentReview_back_to_Pending`**
- Expected: `proof.ReviewNote == "Photo unreadable."`
- Actual: `null`
- Root cause: The `RejectPaymentProofEndpoint` sets `proof.ReviewNote = request.ReviewNote` but the unit test is likely constructing the request without setting the note, or the endpoint is not persisting the note field to the database correctly. Must inspect the test and endpoint to confirm.

**Failure 2 — `InquiryValidatorTests.Rejects_invalid_email(email: "missing@tld")`**
- Expected: `false` (rejected) — the email `missing@tld` should fail validation
- Actual: `true` (accepted) — FluentValidation's built-in `EmailAddress()` rule treats `missing@tld` as valid (single-label TLD is accepted by RFC 5321 but not by common MX reality)
- Root cause: FluentValidation default `.EmailAddress()` uses `EmailValidationMode.Net4xRegex` which accepts single-label TLDs. The fix is switching to `EmailValidationMode.AspNetCoreCompatible` or adding a custom regex requiring at least one dot in the domain portion.

**Rationale:** Both are pre-existing failures unrelated to this feature but must be resolved before a production-ready designation.

---

## 3. RTL/LTR Audit Scope

### Decision: What needs an RTL audit?

Key areas where `left`/`right` or directional classes may still appear:
- `CheckoutPage.tsx` — complex form with address fields; directional padding likely present
- `AdminProductEditPage.tsx` — largest frontend file (25 KB); image management UI
- `AdminOrderDetailPage.tsx` — proof review panel and timeline
- `CartLineRow.tsx` — quantity stepper buttons use `rounded-e-none`/`rounded-s-none` (correct) but the overall layout needs verification
- Any component that uses `gap-x`, `space-x-`, `divide-x` where logical equivalents (`gap`, `space-y`, `divide-y` in column layouts) should be verified

**Confirmed compliant (already using logical classes):**
- `Header.tsx` — uses `gap-1`, `px-4`, `md:px-6` (symmetric, not directional)
- `CartButton.tsx` — uses `-end-1`, `-top-1` (logical)
- `CartLineRow.tsx` — uses `rounded-e-none`, `rounded-s-none`, `me-*` (correct)
- `AdminSidebar.tsx` — uses `ps-*`, `pe-*` pattern (logical)

---

## 4. HeroUI v3 Drawer Controlled API

### Decision: `isOpen` + `onOpenChange` on `<Drawer>`

Confirmed (from error trace analysis and component structure): HeroUI v3 `Drawer` accepts `isOpen: boolean` and `onOpenChange: (open: boolean) => void` for controlled mode. `Drawer.Trigger` renders its own `<button>` and must NOT wrap another `<Button>` component. The fix (already applied in CartButton) is to use controlled mode and drive open state externally.

**Rationale:** This fix eliminates the `<button> cannot be a descendant of <button>` hydration error.

---

## 5. Missing Frontend Pages / Incomplete UX Flows

### Decision: Gaps to close in this feature

**Account shell (`/account`):** Currently a `ShellPage` stub. Needs to be a real buyer account dashboard with links to Orders, Addresses, and profile info — not a placeholder.

**Order detail proof upload UX:** The `OrderDetailPage` includes proof upload but needs verification that it shows correctly in all 4 states.

**Empty states:** Catalog empty state (no results for active filters), Orders empty state (no orders yet), and Admin pages need consistent empty-state components with the correct icon + heading + help text pattern from `DESIGN_PRINCIPLES.md §6`.

**Admin Hub KPI panel:** `AdminHubPage.tsx` (3 KB) is likely minimal. Should show order counts by status, recent orders, and quick-action links.

**Pagination:** CatalogPage pagination must be verified to work; AdminOrdersListPage pagination needs consistent behavior.

---

## 6. i18n Coverage

### Decision: No build-time i18n coverage check yet

The `PROJECT_MAP.md` records a Vitest + i18n coverage script as M5 tooling. For this milestone, the fix is to manually audit both `ar` and `en` locale files for any missing keys against the existing UI code, and add missing keys. A build-time check script remains M5 tooling.

**Key namespaces to audit:**
- `common`, `auth`, `catalog`, `cart`, `checkout`, `orders`, `account`, `admin`, `inquiries`, `addresses`

---

## 7. Backend Startup Configuration

### Decision: Environment variable approach for test isolation

`Program.cs` reads `ConnectionStrings:Default` and `Jwt:Secret` eagerly before `builder.Build()`. The fix (already applied) sets these as process-level environment variables in the `WebApplicationFactory` constructor. This is acceptable because:
1. Environment variables are the standard .NET configuration source
2. The in-memory DbContext override in `ConfigureWebHost` still runs post-build
3. The `DatabaseSeeder` skips seeding in the "Testing" environment

No changes to `Program.cs` are needed for test isolation.

---

## 8. Admin Endpoint Authorization Invariant

### Decision: Group-level `RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" })` 

Already fixed: `AdminEndpoints.cs` now applies `RequireAuthorization(new AuthorizeAttribute { Roles = UserRoles.Admin })` at the `/api/admin` route group, which propagates `IAuthorizeData.Roles = "Admin"` to every child endpoint. The `AdminRoleRoutingTests` pass.

---

## 9. Checkout Flow — Address Book Integration

### Decision: Single-address inline capture (M3); no multi-address book in checkout (M4 deferred)

The current `CheckoutPage.tsx` captures address inline during checkout. The `AddressBookPage` exists for viewing but is not yet wired to pre-fill checkout. This remains the M4 scope item. For this milestone, the inline capture approach is acceptable.

---

## 10. Alternatives Considered

| Question | Chosen | Alternatives Rejected |
|---|---|---|
| Test isolation approach | Env vars in Factory constructor | appsettings.Testing.json (would require shipping fake secrets in repo); mock IConfiguration (too invasive) |
| Admin route auth | Group-level AuthorizeAttribute with Roles | Per-endpoint inline policy (IAuthorizeData.Roles not populated, breaks test); global filter (too broad) |
| Nested button fix | Controlled Drawer state | asChild prop (HeroUI v3 Drawer.Trigger doesn't expose it reliably); render-prop (not in HeroUI API) |
| i18n coverage | Manual audit + runtime checks | Build-time script (M5 scope, needs Vitest infrastructure first) |
| FluentValidation email | AspNetCoreCompatible mode or regex with required dot | Keep Net4xRegex default (fails test, rejects valid real emails inconsistently) |
