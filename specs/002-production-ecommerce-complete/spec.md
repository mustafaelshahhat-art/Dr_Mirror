# Feature Specification: Production-Ready E-Commerce Platform

**Feature Branch**: `002-production-ecommerce-complete`

**Created**: 2026-05-15

**Status**: Draft

**Input**: Arabic-first, RTL specialist e-commerce web application for medical scrubs and uniforms, with a public storefront, authenticated buyer flows, and a role-protected admin dashboard — fully completed, polished, stable, secure, maintainable, and production-ready.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Lands on Admin Dashboard (Priority: P1)

A user with the Admin role opens the application. They are routed directly to the Admin Dashboard without ever seeing the public storefront. From the dashboard they can manage orders, users, catalog, inquiries, and payment methods.

**Why this priority**: Role separation is a security and UX prerequisite. Admins must never share the customer shell, and customers must never access admin surfaces.

**Independent Test**: Sign in as Admin, observe redirect to `/admin`; sign in as buyer, observe normal storefront landing page.

**Acceptance Scenarios**:

1. **Given** a user with the Admin role is authenticated, **When** they navigate to `/`, **Then** they are automatically redirected to `/admin` and see the Admin Hub page.
2. **Given** a user with the Admin role is on the Admin Dashboard, **When** they attempt to access `/`, **Then** they remain in the admin shell without seeing the storefront header or cart.
3. **Given** a non-admin authenticated buyer is on the storefront, **When** they attempt to navigate to `/admin`, **Then** they are redirected to a 403/Forbidden page and are not shown any admin UI.
4. **Given** an unauthenticated visitor, **When** they attempt to access `/admin`, **Then** they are redirected to the login page and, upon successful login as a non-admin, are NOT forwarded to `/admin`.

---

### User Story 2 — Buyer Browses and Filters the Catalog (Priority: P1)

A buyer (logged in or guest) opens the storefront and browses the product catalog for medical scrubs and uniforms. They can filter by category, color, size, and price range, sort by newest/price, and paginate through results. Each product card shows the primary image, name (in the active language), price, and availability.

**Why this priority**: Catalog browsing is the entry point for all purchases; without it no revenue is generated.

**Independent Test**: Open the catalog page without logging in, apply at least two filters, verify results update correctly in both Arabic and English UI modes.

**Acceptance Scenarios**:

1. **Given** a visitor loads the home or catalog page, **When** the page renders, **Then** they see a grid of product cards for active products only, rendered in the current language.
2. **Given** a buyer selects a category filter, **When** the filter is applied, **Then** only products belonging to that category are displayed and the URL reflects the filter state.
3. **Given** a buyer is browsing in Arabic (RTL), **When** they view the catalog, **Then** all text, alignment, icons, and layout use RTL-safe logical properties with no visual breakage.
4. **Given** a catalog page is open, **When** the buyer switches language, **Then** all product names, category labels, and UI labels update instantly without a page reload.

---

### User Story 3 — Buyer Views Product Detail and Selects a Variant (Priority: P1)

A buyer clicks on a product card and sees the product detail page: gallery images, full description, variant picker (color + size), stock indicator, and an add-to-cart button. They select a valid variant and add it to their cart.

**Why this priority**: Variant selection and cart addition is the core purchase action.

**Independent Test**: Open a product with multiple variants, select each color/size combination, verify stock count and add-to-cart state, add one to cart, verify cart badge increments.

**Acceptance Scenarios**:

1. **Given** a buyer opens a product detail page, **When** the page loads, **Then** the gallery, name, price, and variant picker are all visible with the first available variant pre-selected.
2. **Given** a buyer selects a color and size, **When** a valid in-stock combination is chosen, **Then** the Add to Cart button is enabled and shows the correct price.
3. **Given** a buyer selects a color/size combination that is out of stock, **When** the variant is selected, **Then** the Add to Cart button is disabled and an out-of-stock indicator is shown.
4. **Given** a buyer presses Add to Cart, **When** the action completes, **Then** the cart icon badge increments, and the item appears in the cart drawer with correct name, color, size, and price.

---

### User Story 4 — Guest and Authenticated Cart Flow (Priority: P1)

A guest buyer adds items to their cart (stored locally), then signs in. Their guest cart merges with their server cart. From the cart page they can update quantities, remove items, and proceed to checkout.

**Why this priority**: Cart integrity across auth state transitions is business-critical; lost carts = lost revenue.

**Independent Test**: Add items as guest, sign in, verify merged cart, update quantity, remove an item, verify totals.

**Acceptance Scenarios**:

1. **Given** a guest has items in their local cart and signs in, **When** authentication completes, **Then** the guest cart is merged with the server cart and the guest cart is cleared from local storage.
2. **Given** a buyer is on the cart page, **When** they increment or decrement a line item's quantity, **Then** the line total and subtotal update immediately.
3. **Given** a buyer is on the cart page with at least one item, **When** they click Proceed to Checkout, **Then** they are taken to the checkout page with their items pre-populated.
4. **Given** a buyer removes the last item from the cart, **When** the cart becomes empty, **Then** an empty cart state message is shown.

---

### User Story 5 — Buyer Completes Checkout and Submits Payment Proof (Priority: P1)

A buyer on the checkout page confirms their order details (items, address, payment method), places the order, and — for bank-transfer payment methods — uploads a payment proof screenshot. The order moves to Pending Payment Review.

**Why this priority**: Checkout completion is the transaction event that generates revenue.

**Independent Test**: Complete a checkout with a bank-transfer method, upload an image, verify order status changes and confirmation is shown.

**Acceptance Scenarios**:

1. **Given** a buyer is on the checkout page, **When** they confirm the order, **Then** an order is created with status Pending and a unique order number is displayed.
2. **Given** an order requires bank transfer and a buyer uploads a proof image, **When** the upload is accepted, **Then** the order status moves to Pending Payment Review.
3. **Given** a buyer submits an order, **When** the order is confirmed, **Then** a confirmation email is sent to their registered email address.
4. **Given** a buyer views their order history, **When** the order list loads, **Then** all their orders are displayed with status, date, and total in the current language.

---

### User Story 6 — Admin Reviews Orders and Manages Status (Priority: P2)

An admin opens the Orders panel in the admin dashboard and sees all orders paginated and filterable by status. They can open an order, review its payment proof (if uploaded), approve or reject it with a review note, and transition the order through its lifecycle states.

**Why this priority**: Order management is the primary operational activity of the admin.

**Independent Test**: Log in as admin, navigate to orders, filter by Pending Payment Review, approve a proof, verify status changes to Paid.

**Acceptance Scenarios**:

1. **Given** an admin opens the Orders panel, **When** the list loads, **Then** all orders are shown most-recent-first with status badge, buyer name, total, and order date.
2. **Given** an admin opens an order with an uploaded payment proof, **When** they click Approve, **Then** the proof status changes to Approved, the order moves to Paid, and the buyer receives an email notification.
3. **Given** an admin rejects a proof with a review note, **When** rejection is confirmed, **Then** the order bounces back to Pending and the buyer is notified with the rejection reason.
4. **Given** an admin transitions an order to Shipped or Delivered, **When** the transition is applied, **Then** the order timeline reflects the new state and the buyer is notified.

---

### User Story 7 — Admin Manages Product Catalog (Priority: P2)

An admin can create, edit, and deactivate products including their bilingual names, descriptions, categories, images, and variants (color, size, stock, price). Changes are reflected on the storefront immediately.

**Why this priority**: Catalog management is the content backbone of the store.

**Acceptance Scenarios**:

1. **Given** an admin creates a new product with required fields, **When** the product is saved as Active, **Then** it immediately appears on the public storefront.
2. **Given** an admin adds a new variant to an existing product, **When** the variant is saved, **Then** buyers can select it on the product detail page.
3. **Given** an admin sets a product to Inactive, **When** a buyer navigates to that product URL, **Then** a not-found or unavailable page is shown.
4. **Given** an admin uploads product images, **When** images are saved, **Then** they appear in the product gallery in the order specified.

---

### User Story 8 — Admin Manages Users and Roles (Priority: P2)

An admin can view all registered users, search by name or email, and update their role assignments. An admin cannot remove their own admin role.

**Acceptance Scenarios**:

1. **Given** an admin opens the Users panel, **When** they search for a name, **Then** the user list is filtered to matching results.
2. **Given** an admin promotes a buyer to Admin, **When** the role is saved, **Then** that user is treated as an admin on their next request/session refresh.
3. **Given** an admin attempts to remove their own Admin role, **When** the action is submitted, **Then** it is rejected with a clear error message.

---

### User Story 9 — Bilingual UI with Full RTL/LTR Parity (Priority: P1)

A user can switch between Arabic and English at any time. In Arabic mode the entire UI renders RTL with correct mirroring of layout, icons, navigation, and text alignment. In English mode the UI is LTR. No hardcoded directional styles (left/right margins, padding, floats) are used where logical properties (start/end, margin-inline) should apply.

**Acceptance Scenarios**:

1. **Given** the UI is in Arabic mode, **When** any page is rendered, **Then** `dir="rtl"` is set on the root element and all layout uses RTL-safe logical properties.
2. **Given** a user switches from Arabic to English, **When** the switch completes, **Then** all UI text, labels, and navigation update without a page reload and the layout flips to LTR.
3. **Given** an RTL page is open, **When** drawer panels, modals, and dropdowns open, **Then** they animate and position correctly for the RTL reading direction.

---

### User Story 10 — Dark and Light Theme Support (Priority: P2)

A user can toggle between dark and light themes. The theme preference is persisted and applied consistently across all pages and components including the admin dashboard.

**Acceptance Scenarios**:

1. **Given** a user selects light theme, **When** any page is loaded, **Then** all surfaces, cards, text, and borders use the light palette with sufficient contrast.
2. **Given** a user's OS preference is dark mode and they have not made an explicit selection, **When** they first load the app, **Then** dark mode is applied by default.

---

### Edge Cases

- What happens when a product variant goes out of stock after it has been added to a buyer's cart?
- How does the system handle a payment proof upload that exceeds the maximum file size?
- What happens when an admin session expires while they are submitting a status transition?
- How does the RTL layout behave when product names or user names are mixed Arabic/English (bidi text)?
- What happens if a buyer attempts checkout with an item that became unavailable between cart add and checkout?
- How is the merge handled when a guest cart variant conflicts with an existing server cart line for the same variant?

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Authorization**

- **FR-001**: The system MUST redirect authenticated users with the Admin role to `/admin` on login or root access; all other authenticated users land on the storefront.
- **FR-002**: The system MUST prevent non-admin users from accessing any `/admin/*` route, returning a 403 Forbidden response.
- **FR-003**: The system MUST require JWT authentication on all admin API endpoints (`/api/admin/*`) and return 401 for missing/invalid tokens, 403 for insufficient role.
- **FR-004**: The system MUST support JWT refresh-token rotation; tokens MUST be stored in httpOnly cookies.
- **FR-005**: Admin API endpoints MUST enforce the Admin role via `[Authorize(Roles = "Admin")]` metadata resolvable by security tests using `IAuthorizeData`.

**Storefront — Catalog**

- **FR-006**: The system MUST display only active products on all public catalog surfaces.
- **FR-007**: The system MUST support filtering products by category, color, size, and price range simultaneously.
- **FR-008**: The system MUST support sorting products by newest, price ascending, and price descending.
- **FR-009**: Product names, descriptions, category labels, and variant attributes MUST be served in both Arabic and English and rendered per the active UI language.
- **FR-010**: All catalog and product pages MUST be accessible to unauthenticated visitors.

**Storefront — Cart & Checkout**

- **FR-011**: The system MUST persist guest cart state in browser local storage keyed per session.
- **FR-012**: The system MUST merge the guest cart into the server cart when a guest authenticates, clearing local storage after a successful merge.
- **FR-013**: The checkout flow MUST validate item availability before creating an order and return a clear error if any item is no longer available.
- **FR-013a**: The system MUST guarantee stock correctness under concurrent checkout attempts — two simultaneous checkouts on the same variant MUST NOT both succeed if only one unit of stock remains. Implementation MUST use optimistic concurrency (rowversion) or pessimistic locking (UPDLOCK) with `ExecutionStrategy.ExecuteAsync` wrapping and at least one concurrent checkout integration test. *(Clarified 2026-05-15: correctness under concurrency is required for production-ready designation; existing counter-gap tolerance is retained but not sufficient for stock integrity.)*
- **FR-014**: The system MUST support multiple payment methods; each method specifies whether a payment proof is required.
- **FR-015**: For proof-required payment methods, buyers MUST be able to upload an image file (JPEG/PNG/WEBP, max 5 MB) as payment evidence.
- **FR-016**: Order confirmation MUST be emailed to the buyer upon successful order creation. Email sending MUST be non-blocking to the user flow — checkout and order creation MUST succeed even if email delivery fails.
- **FR-016a**: Failed email delivery attempts MUST be retried up to 3 times with exponential backoff. Each failed attempt MUST be logged at WARNING level. Exhaustion of all retries MUST be logged at ERROR level including recipient, email type, exception message, and order/correlation ID. *(Clarified 2026-05-15.)*

**Admin Dashboard**

- **FR-017**: The admin dashboard MUST provide paginated, filterable order management including status transitions and payment proof review.
- **FR-018**: The admin MUST be able to approve or reject payment proofs with a mandatory review note for rejections; approval/rejection MUST trigger buyer email notifications.
- **FR-019**: The admin MUST be able to create, update, and deactivate products including bilingual content, images, categories, and variants.
- **FR-020**: The admin MUST be able to search, view, and update user role assignments; an admin MUST NOT be able to remove their own Admin role.
- **FR-021**: The admin dashboard MUST display unread inquiries from the public contact form and allow marking them as read.
- **FR-022**: The admin MUST be able to configure available payment methods (name, bank details, active status).
- **FR-022a**: The authenticated buyer's `/account` page MUST display a real dashboard — not a stub — showing the buyer's full name, email address, account creation date, and quick-link cards to Orders and Addresses. An optional recent orders preview and order count summary may be shown. Password management is explicitly out of scope for this milestone. *(Clarified 2026-05-15.)*

**Internationalisation & Accessibility**

- **FR-023**: The application MUST support Arabic (RTL) and English (LTR) with full layout mirroring; direction MUST be applied at the document root.
- **FR-024**: All layout MUST use CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) instead of directional aliases (`margin-left`, `padding-right`) to support RTL/LTR parity.
- **FR-025**: Language preference MUST be persisted and applied across page loads and sessions.
- **FR-026**: All interactive elements MUST have ARIA labels in the active language; focus management MUST be correct on modals and drawers.

**Performance & Stability**

- **FR-027**: The backend startup MUST NOT throw if required configuration is absent in development; missing secrets MUST produce clear startup errors pointing to the missing key.
- **FR-028**: All admin API endpoints MUST be covered by a routing security test verifying the `Admin` role requirement is present in endpoint metadata.
- **FR-029**: The application MUST apply rate limiting to sensitive endpoints (auth, admin APIs) to prevent brute-force and abuse.
- **FR-030**: Database migrations MUST be applied automatically on startup in non-test environments; the seeder MUST skip in the Testing environment.

### Key Entities

- **User**: Registered account with email, full name, hashed password, role set (Admin, Buyer). One user has many orders.
- **Product**: Active/inactive item with bilingual name and description, one category, many images, many variants.
- **ProductVariant**: Specific color + size combination of a product with its own price and stock count.
- **Category**: Hierarchical product grouping with bilingual name and slug.
- **Order**: Buyer's purchase with a unique order number, status, line items, selected payment method, and payment proofs.
- **OrderItem**: A line in an order referencing a product variant with quantity and unit price at time of order.
- **PaymentProof**: Image upload attached to an order, with approval status and reviewer notes.
- **PaymentMethod**: Configurable payment option (bank transfer, etc.) with active flag.
- **CartItem**: Temporary line in a buyer's server-side or guest cart referencing a product variant and quantity.
- **Inquiry**: Contact form submission with name, email, message, and read status.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All `/api/admin/*` endpoints return 401 for unauthenticated requests and 403 for requests authenticated as a non-admin user.
- **SC-002**: The `AdminRoleRoutingTests` security test suite passes 100% — every registered admin route carries the `Admin` role requirement in its endpoint metadata.
- **SC-003**: An authenticated admin user is redirected to `/admin` within one navigation event of logging in; no storefront route is rendered.
- **SC-004**: A guest buyer can add items, sign in, and find their cart intact (merged) within the same browser session with no manual intervention.
- **SC-005**: All catalog, product detail, and cart pages render without layout breakage in both RTL (Arabic) and LTR (English) modes across desktop (1280px+) and mobile (375px) viewports.
- **SC-006**: Switching language on any page takes under 300 ms and requires no full page reload.
- **SC-007**: A buyer can complete the full checkout flow (select items → checkout → confirm → upload proof) in under 5 minutes under normal conditions.
- **SC-013**: Two concurrent checkout requests against the same single-unit variant result in exactly one successful order and one stock-unavailable error — verified by at least one concurrent checkout integration test.
- **SC-008**: An admin can review and approve or reject a payment proof in under 3 clicks from the order detail view.
- **SC-009**: No `<button>` element is nested inside another `<button>` in any rendered page (zero hydration errors of this type).
- **SC-010**: The application starts successfully in the Development and Testing environments without requiring a live database connection (in-memory database is used for tests).
- **SC-011**: All pages meet WCAG 2.1 AA colour contrast requirements in both dark and light themes.
- **SC-012**: The admin dashboard renders correctly and fully in both Arabic (RTL) and English (LTR) modes including the sidebar, data tables, and forms.

---

## Assumptions

- The application is a SPA (React + Vite) backed by a .NET ASP.NET Core minimal-API backend; no SSR is used, so "hydration" refers to client-side React rendering.
- The primary deployment target is a Windows hosting environment (MonsterASP) for the backend and a static CDN (Vercel/Netlify) for the frontend.
- All payment processing is manual (buyer uploads a bank transfer proof; admin approves/rejects). No payment gateway integration (Stripe, PayPal, etc.) is in scope.
- Email delivery uses an SMTP provider already configured in production environment variables; templates are pre-defined.
- Image storage uses an environment-switched `IFileStorageService` abstraction: local filesystem in development/testing, Cloudinary in production. The Cloudinary implementation MUST be compile-safe and MUST emit a descriptive startup error if required credentials (`Cloudinary:CloudName`, `Cloudinary:ApiKey`, `Cloudinary:ApiSecret`) are missing when `FileStorage:Provider=cloudinary`. Wiring live production credentials is an operational deployment concern, not a code milestone deliverable. *(Clarified 2026-05-15.)*
- The product catalogue is maintained exclusively by admins; there is no self-service seller or marketplace model.
- Mobile browsers (iOS Safari, Android Chrome) must be supported; native mobile apps are out of scope.
- The admin dashboard is intended for internal staff use only and does not need to support extremely high concurrent admin users (< 20 simultaneous admins expected).
- Accessibility target is WCAG 2.1 AA; AAA compliance is aspirational but not mandatory for this phase.
- All monetary values are in Egyptian Pound (EGP); currency formatting uses locale-aware formatting: `1,250.00 ج.م` in Arabic and `EGP 1,250.00` in English, both with Western numerals and `tabular-nums`. *(Clarified 2026-05-15: SAR was an error in the original assumption; all code, seeds, and locale files use EGP.)*
