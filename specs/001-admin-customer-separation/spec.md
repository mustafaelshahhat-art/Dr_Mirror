# Feature Specification: Admin / Customer Separation & Production Polish

**Feature Branch**: `001-admin-customer-separation`

**Created**: 2026-05-15

**Status**: Draft

**Input**: User description: "Role-based access separation — Admins land on Admin Dashboard only and never see the public Home Page; visitors and customers continue to use the public store. Application must reach production-ready polish across security, UX, performance, and accessibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin signs in and is taken straight to the Admin Dashboard (Priority: P1)

A staff member with the Admin role signs in. The moment authentication succeeds, the system places them in the Admin Dashboard — not the customer-facing storefront. From that point on, every navigation attempt that targets a customer surface (storefront landing, product browsing, cart, checkout, buyer account) is rejected and the user is returned to an admin surface. The brand mark, primary navigation, and any "view as customer" affordances are absent from the admin shell, so the admin cannot accidentally drift into customer-facing UI.

**Why this priority**: This is the headline of the request. Until admins are physically separated from the storefront, the role gate that exists today is decorative — admins can still type `/` and see the catalog, the header still shows a cart icon, and the post-login redirect lands them on the storefront. Fixing this first delivers the core promise of the feature.

**Independent Test**: Sign in as a user with the Admin role. Verify the post-login URL is the Admin Dashboard and not the storefront landing. Manually navigate to the storefront URL, a product detail URL, and the cart URL — each must redirect back into the admin surface. Sign out and confirm the user returns to the unauthenticated sign-in entry.

**Acceptance Scenarios**:

1. **Given** an account with the Admin role and valid credentials, **When** the admin submits the sign-in form, **Then** the system navigates them to the Admin Dashboard within the same user-perceived load, with no flash of the customer storefront.
2. **Given** an authenticated admin viewing the Admin Dashboard, **When** they paste the storefront landing URL into the address bar, **Then** the system redirects them back to an admin surface and never renders storefront content.
3. **Given** an authenticated admin, **When** they reload any admin page or open a deep-link to an admin page (e.g., a specific order), **Then** the page restores cleanly without a customer-facing intermediate render.
4. **Given** an authenticated admin, **When** they look at the global header, **Then** they see admin-only navigation (Orders, Products, Categories, Payment Methods, Inquiries, Users) and an account menu, but no storefront brand link to "/", no cart icon, no buyer-account link.
5. **Given** an admin who manually clears their session cookie mid-visit, **When** they next interact with an admin page, **Then** they are taken to the sign-in entry and after re-authentication land back in the Admin Dashboard, not the storefront.

---

### User Story 2 - Visitors and customers experience the storefront unchanged (Priority: P1)

An anonymous visitor or a signed-in buyer continues to use the public store the same way they do today: storefront landing on `/`, product browsing, product detail, cart, checkout, buyer account, address book, order history. The role-separation work does not regress any storefront flow. A buyer who somehow has *only* a non-Admin role on their account never sees admin chrome.

**Why this priority**: The redirect change is small in code but large in blast radius — it touches the sign-in flow, the post-login navigation, and the global shell that wraps every page. This story exists to keep the customer experience explicit and protected as a non-regression bar.

**Independent Test**: Sign in as a customer (or browse anonymously). Confirm every storefront surface renders normally with the customer header (brand link, cart, language toggle, theme toggle, sign-in / account button). Confirm the customer is never redirected to an admin URL, and that typing an admin URL into the address bar produces a sign-in prompt (if anonymous) or a redirect back to the storefront landing (if signed in without the Admin role).

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they load the storefront landing, **Then** they see the customer catalog with the customer header and footer chrome and no admin links.
2. **Given** a signed-in buyer, **When** they sign in successfully, **Then** they return to whichever storefront URL they were trying to reach (or the storefront landing if there was no prior destination).
3. **Given** a signed-in buyer, **When** they paste an admin URL into the address bar, **Then** they are redirected to the storefront landing without seeing any admin content.
4. **Given** an authenticated buyer, **When** they navigate around the storefront, **Then** all existing flows (browse, filter, product detail, add-to-cart, checkout, order tracking, address book, payment-proof upload) continue to work as they did before the change.

---

### User Story 3 - Application reaches production-ready polish across security, UX, performance, accessibility (Priority: P2)

Before the work is signed off, the platform passes a production-readiness review covering: secret hygiene, authentication hardening, error-contract consistency, broken or incomplete flows, UI/UX inconsistencies, responsive layout, accessibility, performance budget, dead code, and unused dependencies. Findings discovered during the codebase analysis phase are either fixed or recorded in the project's `[ORPHANS & PENDING]` register with an owner and target milestone.

**Why this priority**: The user explicitly scoped the work as "fully completed, polished, and production-ready." Capturing the polish work as a story keeps the scope visible and testable, rather than letting it become an open-ended "while you're in there" tax that is impossible to sign off.

**Independent Test**: Run the production-readiness checklist generated for this feature. Every item is either checked or has an explicit deferral entry. The application boots cleanly in production configuration with all required environment variables set, all admin surfaces respond, all customer surfaces respond, no console errors fire on a smoke-test of the primary user journeys, and the four-state UI matrix `(dark|light) × (rtl|ltr)` renders without layout breakage on the main pages.

**Acceptance Scenarios**:

1. **Given** the production-readiness checklist for this feature, **When** the team walks through it, **Then** every item is either marked complete or has a written deferral with rationale and the deferral is reflected in `PROJECT_MAP.md`'s `[ORPHANS & PENDING]` section.
2. **Given** the customer storefront, **When** sampled on the primary user journey (browse → product → cart → checkout → order detail), **Then** each step renders correctly in all four `(dark|light) × (rtl|ltr)` states with no layout overflow, no missing translation keys, and no console errors.
3. **Given** the admin surfaces, **When** sampled across the operational surfaces (orders, products, categories, payment methods, inquiries, users), **Then** each renders correctly in the four-state matrix with operational controls usable by keyboard, with destructive actions confirmed before they fire.
4. **Given** the codebase analysis output, **When** dead code, duplicated logic, and unstable implementations are identified, **Then** each item is either removed in this feature or has a deferral entry recorded with an owner.

---

### Edge Cases

- A buyer who is *also* granted the Admin role mid-session: on next sign-in (or token refresh) they MUST be treated as an admin and routed accordingly. The role transition does not require a manual sign-out.
- An admin role removed mid-session: on the next session restore the user MUST be treated as a buyer and routed accordingly; in-flight admin requests MUST return an authorization failure rather than silently succeeding.
- An admin opens the application in a second tab while signed in: both tabs MUST converge on the admin surface; the storefront MUST not be reachable from either.
- A deep link to an admin page from email or chat: anonymous users hit sign-in, authenticate, then land on the deep-linked admin page (not the dashboard root). Non-admin users hit sign-in, authenticate, then land on the storefront landing.
- A user opens the sign-in page while already signed in: an admin is taken to the Admin Dashboard, a buyer is taken to the storefront landing.
- A user whose session expires while viewing an admin page: on next interaction they are bounced to sign-in; after re-auth, an admin returns to the page they were on, a non-admin lands on the storefront landing.
- An admin attempts to add an item to the cart, view checkout, or view a buyer-account URL: each is treated as a storefront URL and redirected away from the admin's view.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & post-sign-in routing**

- **FR-001**: The system MUST inspect the authenticated user's roles immediately upon successful sign-in and, if the user holds the Admin role, navigate them to the Admin Dashboard landing as the first post-sign-in render.
- **FR-002**: For users without the Admin role, the system MUST preserve today's behavior — navigate to the URL the user was trying to reach prior to sign-in, or the storefront landing if no prior destination is recorded.
- **FR-003**: The system MUST never use a recorded pre-sign-in destination to send an admin user to a customer-facing URL; if the recorded destination is a customer URL, the admin MUST still land on the Admin Dashboard.
- **FR-004**: When an authenticated admin loads the sign-in entry directly, the system MUST redirect them to the Admin Dashboard without rendering the sign-in form.
- **FR-005**: When an authenticated buyer loads the sign-in entry directly, the system MUST redirect them to the storefront landing without rendering the sign-in form.

**Route gating**

- **FR-006**: All customer-facing routes (storefront landing, product browse, product detail, cart, checkout, buyer account, buyer order list and detail, address book) MUST refuse to render for users holding the Admin role and instead redirect them to the Admin Dashboard.
- **FR-007**: All admin-facing routes MUST refuse to render for users without the Admin role; anonymous users MUST be sent to sign-in with the originally requested admin URL preserved, and authenticated non-admins MUST be sent to the storefront landing.
- **FR-008**: Route gating MUST run after session restore (cookie-backed refresh) completes; the application MUST show a non-content loading state during restore so the user never briefly sees a page they are not permitted to view.
- **FR-009**: A user whose role set changes between sessions MUST be routed according to the new role set on the very next authenticated render; no manual cache clear or sign-out should be required.

**Shell separation**

- **FR-010**: Admin pages MUST render inside an admin shell distinct from the customer shell — no brand link to the storefront landing, no cart icon, no buyer-account link, no storefront navigation.
- **FR-011**: The admin shell MUST expose admin-scope navigation (Orders, Products, Categories, Payment Methods, Inquiries, Users) and an account menu containing at minimum the admin's display name, the language toggle, the theme toggle, and a sign-out action.
- **FR-012**: The customer shell MUST remain available to anonymous visitors and buyers exactly as it is today (brand link, cart, language toggle, theme toggle, sign-in / account button).
- **FR-013**: The admin shell MUST visually distinguish itself from the customer shell so that staff cannot confuse the two surfaces at a glance, while still honoring the project's dark-first / RTL design rules.

**Server-side enforcement**

- **FR-014**: All admin operations MUST remain gated by server-side authorization that checks the Admin role on every request; client-side routing is treated as a UX optimization, never as the source of truth for access control.
- **FR-015**: The system MUST return a clear authorization failure (not a generic error) when an authenticated non-admin user invokes an admin operation, so that the client can render an appropriate "not authorized" state instead of an opaque error.

**Production-readiness scope (bounded polish)**

- **FR-016**: The system MUST pass a production-readiness review covering: secret hygiene (no committed secrets), authentication hardening (token rotation, session restore, sign-out cleanup), error contract consistency (standard error envelope everywhere), and rate-limiting on authentication and inquiry endpoints.
- **FR-017**: The system MUST be free of unused routes, dead components, duplicated formatting logic, and inconsistent styling. Items that cannot be resolved within this feature MUST be recorded in the project's `[ORPHANS & PENDING]` register with an owner and target milestone.
- **FR-018**: Every user-visible string introduced or modified by this feature MUST exist in both the Arabic and English locale resources; missing keys MUST block release.
- **FR-019**: The primary customer journey (browse → product → cart → checkout → order detail) and the primary admin journey (sign-in → dashboard → orders queue → order detail → state transition) MUST each be verifiable end-to-end without manual data setup beyond the project's existing seed data.
- **FR-020**: The four-state UI matrix `(dark|light) × (rtl|ltr)` MUST render without layout overflow, mirrored-icon errors, missing translation keys, or `tabular-nums` regressions on the primary customer and admin surfaces.
- **FR-021**: Destructive admin actions (state transitions on terminal orders, role removals, deletions) MUST require an explicit confirmation before the action fires, and the confirmation MUST clearly state the consequence.
- **FR-022**: Sign-out from any surface MUST clear the user's session both on the server (refresh-token revocation) and on the client (in-memory user, query cache, route to the appropriate post-sign-out landing).
- **FR-023**: The system MUST honor `prefers-reduced-motion` on all animations introduced or modified by this feature.

### Key Entities

This feature is a behavioral and shell-level change rather than a data model change. The existing entities (User, Role assignment, Order, Cart, Address, Product, Category, Payment Method, Inquiry) are unchanged. The only conceptual entities the feature relies on are:

- **Authenticated session**: an authenticated user record carrying a set of role names. The presence of "Admin" in that set is the sole driver of admin routing decisions.
- **Post-sign-in destination**: the URL the user was trying to reach before sign-in. For admins, this is overridden in favor of the Admin Dashboard landing; for buyers, this remains the destination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sign-in attempts by Admin-role users land on the Admin Dashboard on the first post-sign-in render, with zero observed flashes of customer storefront content on either initial sign-in or page reload.
- **SC-002**: 100% of attempts by Admin-role users to load a customer-facing URL by deep-link or address-bar entry are intercepted and routed to an admin surface within one navigation hop, with no customer content rendered.
- **SC-003**: Customer storefront flows complete without regression: a buyer can sign in, browse the catalog, open a product, add a variant to cart, check out, upload a payment proof, and view the order detail. Every step succeeds on at least 95% of attempts in smoke testing.
- **SC-004**: The four-state UI matrix `(dark|light) × (rtl|ltr)` passes visual review on the storefront landing, product detail, cart, checkout, the Admin Dashboard, the admin orders queue, and the admin order detail page, with no layout overflow, no mirrored-icon errors, and no missing translation keys.
- **SC-005**: Every admin operation invoked by a non-admin (whether anonymous or authenticated) returns an authorization failure from the server, with no resource exposed and no operation executed; in a sample of representative endpoints, 100% return the standard error envelope rather than an opaque or stack-trace error.
- **SC-006**: The production-readiness checklist for this feature is 100% checked or contains an explicit deferral, and every deferral has a matching entry in `PROJECT_MAP.md`'s `[ORPHANS & PENDING]` section with an owner and target milestone.
- **SC-007**: The primary customer journey (sign-up → browse → product → cart → checkout → order detail) completes in under three minutes for a representative buyer following the happy path, without consulting documentation.
- **SC-008**: The primary admin journey (sign-in → dashboard → orders queue → order detail → approve payment proof or transition order state) completes in under two minutes for a representative admin following the happy path, without consulting documentation.
- **SC-009**: No console errors fire on a smoke test of the primary customer and admin journeys in either locale and either theme. Console warnings related to missing translation keys, missing `alt` text, or hydration mismatches register as zero.
- **SC-010**: After sign-out from any surface, attempting to revisit a protected URL by browser back-button always returns the user to the sign-in entry, never to a stale authenticated view.

## Assumptions

- "Admin" is the sole staff role considered by this feature; finer-grained staff sub-roles (e.g., Catalog Editor, Order Reviewer) are out of scope.
- A user holding only the Admin role is presumed to be a staff member. The product does not currently support a "view storefront as a staff member" mode, and adding one is out of scope.
- A user holding both the Admin role and a buyer-style identity is treated as an admin everywhere — the admin surface wins. Supporting a "switch to customer view" toggle is out of scope.
- The existing session-restore handshake (cookie-backed token refresh on cold boot) is reused; this feature does not change the authentication protocol itself.
- The existing storefront layout and design language are correct in intent and only need polish; the admin shell will introduce an admin-scoped navigation surface while remaining within the project's dark-first / RTL / four-state design rules.
- Production-readiness work is scoped to issues uncovered by the codebase analysis that block release or that violate the project's constitution. Items that are nice-to-have but not blocking are deferred to a future milestone rather than expanded into this feature.
- The platform remains single-currency (EGP) and bilingual (Arabic primary, English secondary); locale and currency changes are out of scope.
- Inquiry, address-book, admin user-role-management, and payment-method CRUD surfaces already exist and require polish rather than fresh implementation.
