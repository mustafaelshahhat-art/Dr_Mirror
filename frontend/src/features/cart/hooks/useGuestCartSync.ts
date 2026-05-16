import { useEffect, useState } from 'react';

import {
  GUEST_CART_EVENT,
  isGuestCartStorageKey,
  readGuestCart,
} from '../guest-cart-storage';
import type { GuestCartLine } from '../types';

/**
 * Manages the guest-cart slice backed by localStorage.
 * Keeps React state in sync with both same-tab writes (via the custom
 * GUEST_CART_EVENT) and cross-tab writes (via the native storage event).
 */
export function useGuestCartSync(): [
  GuestCartLine[],
  React.Dispatch<React.SetStateAction<GuestCartLine[]>>,
] {
  const [guestLines, setGuestLines] = useState<GuestCartLine[]>(() =>
    readGuestCart(),
  );

  useEffect(() => {
    function rehydrate() {
      setGuestLines(readGuestCart());
    }
    function onStorage(e: StorageEvent) {
      if (isGuestCartStorageKey(e.key)) rehydrate();
    }
    window.addEventListener(GUEST_CART_EVENT, rehydrate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(GUEST_CART_EVENT, rehydrate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return [guestLines, setGuestLines];
}
