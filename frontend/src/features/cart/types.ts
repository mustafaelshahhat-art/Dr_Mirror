/**
 * Wire types for the cart slice. Mirror the backend DTOs in
 * `Features/Cart/Common/CartDtos.cs` exactly — never let these drift.
 */

export interface CartItemDto {
  id: string;
  productId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  productVariantId: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitPriceSnapshot: number;
  lineTotal: number;
  variantStock: number;
  primaryImageUrl: string | null;
  isAvailable: boolean;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subTotal: number;
  totalQuantity: number;
  updatedAt: string;
}

export interface AddCartItemRequest {
  productVariantId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface MergeCartRequest {
  items: Array<{
    productVariantId: string;
    quantity: number;
  }>;
}

/**
 * Per-line snapshot the SPA carries in localStorage so the mini-cart can
 * render without round-tripping every product. On sign-in we POST only
 * `{ productVariantId, quantity }` to /api/cart/merge — the server projects
 * the authoritative display shape back.
 */
export interface GuestCartLine {
  productVariantId: string;
  quantity: number;
  // Snapshot for offline rendering. Re-validated server-side at merge time.
  productId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sku: string;
  unitPrice: number;
  primaryImageUrl: string | null;
  variantStock: number;
  addedAt: string;
}

/** Per-line cap (mirrors backend CartLimits.MaxQuantityPerLine). */
export const MAX_QUANTITY_PER_LINE = 99;
