# Contract — Checkout Response: `addressSaveOutcome`

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18 | **Source**: spec FR-017, FR-018, FR-019 + clarify Q4

This contract specifies the additive field added to the checkout success response.

---

## Endpoint

`POST /api/checkout` (create order). Body shape unchanged.

---

## Response body delta

The `200 OK` (and `201 Created`) response body for a successful checkout gains exactly one new field:

```jsonc
{
  // …existing fields unchanged…
  "addressSaveOutcome": "saved" | "skipped_book_full" | "not_requested"
}
```

The field is:

- **Always present** on a successful response (never absent, never `null`).
- **Always one of the three literal string values** above.
- **Non-breaking** for old SPA bundles, which ignore unknown response fields.

---

## Value semantics

| Value | When emitted |
|---|---|
| `"not_requested"` | The buyer did NOT enable "save this address to my address book" on the checkout form. |
| `"saved"` | The buyer enabled the save option, the address-book had room, and a new `BuyerAddress` row was inserted in the same transaction as the order. |
| `"skipped_book_full"` | The buyer enabled the save option, but the address-book was already at the configured per-user cap; the order succeeded, the save was skipped. |

---

## Error and non-success paths

- `addressSaveOutcome` is emitted only on successful order creation. 4xx/5xx responses do not carry the field.
- The order itself MUST succeed under all three outcomes; the save-outcome value does NOT influence the order's status code.

---

## SPA contract (consumer side)

The SPA (`frontend/src/features/checkout/...`):

- Reads `addressSaveOutcome` from the checkout response.
- If the value is `"skipped_book_full"`, renders a localized toast using the existing HeroUI toast pattern. The toast title and body are loaded from `locales/ar/checkout.json` and `locales/en/checkout.json` under the keys `addressNotSavedTitle` and `addressNotSavedBody`.
- For values `"saved"` and `"not_requested"`, no toast is rendered.

---

## Verification

| Test | Setup | Expected response field |
|---|---|---|
| Save not requested | `request.SaveAsNewAddress == false` | `"not_requested"` |
| Save succeeds | book has room, save requested | `"saved"`, `BuyerAddresses` row count +1 |
| Book full | book at cap, save requested | `"skipped_book_full"`, `BuyerAddresses` row count unchanged, order still 201 |
