import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, type QueryClient } from '@tanstack/react-query';

import type { AuthUser } from '../../auth/types';
import { cartApi } from '../api';
import { clearGuestCart, readGuestCart } from '../guest-cart-storage';
import type { CartDto } from '../types';

interface UseCartMergeOptions {
  user: AuthUser | null;
  isBootstrapping: boolean;
  queryClient: QueryClient;
}

interface UseCartMergeResult {
  mergeError: string | null;
  performMerge: () => Promise<void>;
}

export function useCartMerge({
  user,
  isBootstrapping,
  queryClient,
}: UseCartMergeOptions): UseCartMergeResult {
  const autoMergedForUserId = useRef<string | null>(null);
  const inFlightForUserId = useRef<string | null>(null);
  const latestUserIdRef = useRef<string | null>(null);

  const [mergeError, setMergeError] = useState<string | null>(null);

  useEffect(() => {
    latestUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const mergeMutation = useMutation<
    CartDto,
    Error,
    { items: { productVariantId: string; quantity: number }[] }
  >({
    mutationFn: (payload) => cartApi.merge(payload),
  });

  const performMerge = useCallback(async () => {
    if (!user) return;

    const userId = user.id;
    if (inFlightForUserId.current === userId) return;

    setMergeError(null);
    const stash = readGuestCart();
    if (stash.length === 0) {
      autoMergedForUserId.current = userId;
      return;
    }

    autoMergedForUserId.current = userId;
    inFlightForUserId.current = userId;

    try {
      const merged = await mergeMutation.mutateAsync({
        items: stash.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
        })),
      });

      if (latestUserIdRef.current !== userId) return;

      clearGuestCart();
      queryClient.setQueryData(['cart'], merged);
    } catch (err) {
      if (latestUserIdRef.current !== userId) return;

      setMergeError(
        err instanceof Error
          ? err.message
          : 'Failed to sync your cart. Please try again.',
      );
    } finally {
      if (inFlightForUserId.current === userId) {
        inFlightForUserId.current = null;
      }
    }
  }, [user, mergeMutation, queryClient]);

  useEffect(() => {
    if (!user || isBootstrapping) return;
    if (autoMergedForUserId.current === user.id) return;
    void performMerge();
  }, [user, isBootstrapping, performMerge]);

  useEffect(() => {
    if (!user) {
      autoMergedForUserId.current = null;
      inFlightForUserId.current = null;
    }
  }, [user]);

  return { mergeError, performMerge };
}
