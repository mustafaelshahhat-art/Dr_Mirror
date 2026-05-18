# Phase 1 — Data Model: UI/UX Excellence Pass

**Status**: N/A — this pass introduces no new data entities.

The pass changes only the rendered surface of existing entities. The set of entities the touched pages display is unchanged:

| Entity (existing) | Touched pages | What changes |
|-------------------|---------------|--------------|
| Product | `ProductDetailPage`, `ProductCard`, `AdminProductEditPage`, `AdminProductsListPage` | layout, tabs, tooltips, container query |
| Cart line | `CartPage`, `CartLineRow` | quantity stepper control + container query |
| Order | `OrderDetailPage`, `OrdersListPage`, `AdminOrderDetailPage` | snippet next to H1, tabs (admin), modal cancel (admin), container query |
| Payment proof | `PaymentProofUpload`, `PaymentInstructionsCard`, `AdminProofReview` | progress bar, modal reject, snippet adoption |
| Audit log entry | `AuditLogPage` | HeroUI Select/DatePicker, em-dash fix |
| User | `AdminUsersPage` | tooltips on row actions |
| Inquiry | `AdminInquiriesPage` | tooltips on row actions |
| Payment method | `PaymentMethodRow` | Switch + Tooltip |
| Address | `AddressForm`, `AddressBookPage` | container query for name/phone row |
| Category, Size, Color (variant pickers) | `CategoryChips`, `SizePicker`, `ColorPicker`, `FilterPanel.GenderPill` | unchanged (intentional non-conversions; RAC radiogroup pattern preserved) |

No new attributes, no new relationships, no new state transitions. No EF Core migrations.

The two new files are **components**, not entities:
- `frontend/src/shared/components/Snippet.tsx` — UI primitive wrapper.
- `frontend/src/features/catalog/components/ProductInfoTabs.tsx` — feature-local UI component.

Their *contracts* (props, behavior) are documented in `contracts/`.
