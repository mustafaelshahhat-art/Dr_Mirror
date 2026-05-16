import {
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/useAuth';

import { cartApi } from './api';
import {
  clearGuestCart,
  readGuestCart,
  writeGuestCart,
} from './guest-cart-storage';
import type { CartDto, CartItemDto, GuestCartLine } from './types';
import { MAX_QUANTITY_PER_LINE } from './types';
import {
  CartContext,
  type AddItemInput,
  type CartContextValue,
  type CartView,
} from './CartContext';
import { useGuestCartSync } from './hooks/useGuestCartSync';
import { useCartMerge } from './hooks/useCartMerge';

/**
 * Owns cart state across the entire SPA. Two modes:
 *
 *   guest  → backed by <c>localStorage</c> via <c>guest-cart-storage</c>.
 *   authed → backed by the server, fetched + mutated via React Query.
 *
 * On sign-in we merge the localStorage cart into the server via the
 * <c>/api/cart/merge</c> endpoint and clear local state. The merge is
 * fire-and-forget — if it fails the guest cart stays so the buyer can retry.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const queryClient = useQueryClient();
  const isAuthed = Boolean(user);

  // ------- Guest cart (localStorage) ----------------------------------------
  const [guestLines] = useGuestCartSync();

  // ------- Server cart (React Query) ----------------------------------------
  const serverCartQuery = useQuery<CartDto>({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    enabled: isAuthed && !isBootstrapping,
    staleTime: 30_000,
  });

  // ------- Merge guest → server on login ------------------------------------
  const { mergeError, performMerge } = useCartMerge({ user, isBootstrapping, queryClient });

  // ------- Mutations (authed-only) ------------------------------------------
  const addMutation = useMutation<CartDto, Error, AddItemInput>({
    mutationFn: (input) =>
      cartApi.add({
        productVariantId: input.productVariantId,
        quantity: input.quantity,
      }),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });

  const updateMutation = useMutation<CartDto, Error, { id: string; quantity: number }>({
    mutationFn: ({ id, quantity }) => cartApi.update(id, { quantity }),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });

  const removeMutation = useMutation<CartDto, Error, string>({
    mutationFn: (id) => cartApi.remove(id),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });

  const clearMutation = useMutation<CartDto, Error, void>({
    mutationFn: () => cartApi.clear(),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });

  const isMutating =
    addMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    clearMutation.isPending;

  const mutationError =
    addMutation.error ??
    updateMutation.error ??
    removeMutation.error ??
    clearMutation.error ??
    null;

  // ------- Unified view -----------------------------------------------------
  const cart = useMemo<CartView>(() => {
    if (isAuthed) {
      const data = serverCartQuery.data;
      return {
        items: data?.items ?? [],
        subTotal: data?.subTotal ?? 0,
        totalQuantity: data?.totalQuantity ?? 0,
        isMutating,
        isLoading: serverCartQuery.isLoading,
        error: (serverCartQuery.error as Error | null) ?? mutationError,
      };
    }
    return {
      items: guestLines.map(toCartItemDto),
      subTotal: guestLines.reduce(
        (sum, l) => sum + l.unitPrice * Math.max(0, Math.min(l.quantity, l.variantStock)),
        0,
      ),
      totalQuantity: guestLines.reduce(
        (sum, l) => sum + Math.max(0, Math.min(l.quantity, l.variantStock)),
        0,
      ),
      isMutating: false,
      isLoading: false,
      error: null,
    };
  }, [
    isAuthed,
    guestLines,
    serverCartQuery.data,
    serverCartQuery.isLoading,
    serverCartQuery.error,
    isMutating,
    mutationError,
  ]);

  // ------- Public actions ---------------------------------------------------
  const addItem = useCallback(
    async (input: AddItemInput) => {
      if (isAuthed) {
        await addMutation.mutateAsync(input);
        return;
      }

      const lines = [...readGuestCart()];
      const existing = lines.find((l) => l.productVariantId === input.productVariantId);
      if (existing) {
        const next = Math.min(
          existing.quantity + input.quantity,
          MAX_QUANTITY_PER_LINE,
          input.variantStock,
        );
        existing.quantity = Math.max(next, 1);
      } else {
        const qty = Math.min(input.quantity, MAX_QUANTITY_PER_LINE, input.variantStock);
        if (qty <= 0) return;
        lines.push({
          productVariantId: input.productVariantId,
          quantity: qty,
          productId: input.productId,
          productSlug: input.productSlug,
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          size: input.size,
          colorName: input.colorName,
          colorNameAr: input.colorNameAr,
          colorHex: input.colorHex,
          sku: input.sku,
          unitPrice: input.unitPrice,
          primaryImageUrl: input.primaryImageUrl,
          variantStock: input.variantStock,
          addedAt: new Date().toISOString(),
        });
      }
      writeGuestCart(lines);
    },
    [isAuthed, addMutation],
  );

  const updateQuantity = useCallback(
    async (line: CartItemDto, quantity: number) => {
      if (isAuthed) {
        await updateMutation.mutateAsync({ id: line.id, quantity });
        return;
      }
      const lines = readGuestCart();
      const idx = lines.findIndex((l) => l.productVariantId === line.productVariantId);
      if (idx < 0) return;
      lines[idx].quantity = Math.max(
        1,
        Math.min(quantity, MAX_QUANTITY_PER_LINE, lines[idx].variantStock),
      );
      writeGuestCart(lines);
    },
    [isAuthed, updateMutation],
  );

  const removeItem = useCallback(
    async (line: CartItemDto) => {
      if (isAuthed) {
        await removeMutation.mutateAsync(line.id);
        return;
      }
      const lines = readGuestCart().filter(
        (l) => l.productVariantId !== line.productVariantId,
      );
      writeGuestCart(lines);
    },
    [isAuthed, removeMutation],
  );

  const clear = useCallback(async () => {
    if (isAuthed) {
      await clearMutation.mutateAsync();
      return;
    }
    clearGuestCart();
  }, [isAuthed, clearMutation]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      mergeError,
      retryMerge: performMerge,
    }),
    [cart, addItem, updateQuantity, removeItem, clear, mergeError, performMerge],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Project a guest-cart line into the same shape the server returns so the
 * UI can iterate over one type. <c>id</c> falls back to the variant id since
 * guest lines aren't persisted server-side yet.
 */
function toCartItemDto(line: GuestCartLine): CartItemDto {
  const clamped = Math.max(0, Math.min(line.quantity, line.variantStock));
  return {
    id: line.productVariantId, // stable per-variant key for React lists / mutations
    productId: line.productId,
    productSlug: line.productSlug,
    nameAr: line.nameAr,
    nameEn: line.nameEn,
    productVariantId: line.productVariantId,
    size: line.size,
    colorName: line.colorName,
    colorNameAr: line.colorNameAr,
    colorHex: line.colorHex,
    sku: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    unitPriceSnapshot: line.unitPrice,
    lineTotal: line.unitPrice * clamped,
    variantStock: line.variantStock,
    primaryImageUrl: line.primaryImageUrl,
    isAvailable: line.variantStock > 0,
  };
}
