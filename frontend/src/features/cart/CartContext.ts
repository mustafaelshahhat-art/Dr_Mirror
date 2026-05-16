import { createContext } from 'react';

import type { CartItemDto } from './types';

/**
 * Public shape of the cart context — both authed and guest carts project
 * to the same <c>CartView</c> so consumers (mini-cart, /cart page) don't
 * branch on auth state.
 */
export interface CartView {
  items: CartItemDto[];
  subTotal: number;
  totalQuantity: number;
  /** True if a network call is currently mutating the server cart. */
  isMutating: boolean;
  /** True while initial fetch / merge is in flight after sign-in. */
  isLoading: boolean;
  /** Most recent error from a mutation, cleared on the next success. */
  error: Error | null;
}

export interface AddItemInput {
  productVariantId: string;
  quantity: number;
  // -- Snapshot fields (guest cart only — ignored when authed) --
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
}

export interface CartContextValue {
  cart: CartView;
  /** Snapshot fields are required so guest mini-cart can render offline. */
  addItem: (line: AddItemInput) => Promise<void>;
  /** Set absolute quantity for a line (1..99). */
  updateQuantity: (line: CartItemDto, quantity: number) => Promise<void>;
  /** Remove a line entirely. */
  removeItem: (line: CartItemDto) => Promise<void>;
  /** Empty the cart. */
  clear: () => Promise<void>;
  /** Non-null when the post-login guest-cart merge failed. */
  mergeError: string | null;
  /** Re-attempt the guest-cart merge after a failure. */
  retryMerge: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
