import type { GuestCartLine } from './types';

/**
 * localStorage-backed cart for unauthenticated buyers. The shape lives in
 * sync with <see cref="GuestCartLine" /> so we can hydrate the mini-cart
 * without round-tripping the API for product details.
 *
 * Keep this module free of React imports — it's used both from the
 * <c>CartProvider</c> and from raw event listeners (other tabs syncing).
 */
const STORAGE_KEY = 'dr_mirror.guest_cart.v1';

/**
 * Custom event dispatched whenever the guest cart changes locally so the
 * <c>CartProvider</c> can re-read without setting up a manual subscription.
 * Cross-tab sync rides on the native <c>storage</c> event.
 */
export const GUEST_CART_EVENT = 'dr_mirror:guest-cart-change';

export function readGuestCart(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGuestCartLine);
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestCartLine[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    window.dispatchEvent(new CustomEvent(GUEST_CART_EVENT));
  } catch {
    /* localStorage unavailable — safe to ignore */
  }
}

export function clearGuestCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(GUEST_CART_EVENT));
  } catch {
    /* localStorage unavailable — safe to ignore */
  }
}

export function isGuestCartStorageKey(key: string | null): boolean {
  return key === STORAGE_KEY;
}

function isGuestCartLine(value: unknown): value is GuestCartLine {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<GuestCartLine>;
  return (
    typeof v.productVariantId === 'string' &&
    typeof v.quantity === 'number' &&
    typeof v.productId === 'string' &&
    typeof v.productSlug === 'string' &&
    typeof v.nameEn === 'string' &&
    typeof v.size === 'string' &&
    typeof v.colorName === 'string' &&
    typeof v.colorHex === 'string' &&
    typeof v.unitPrice === 'number'
  );
}
