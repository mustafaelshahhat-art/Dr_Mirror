import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCart } from '../../cart/useCart';
import type { AddItemInput } from '../../cart/CartContext';

export type AddToCartState = 'idle' | 'adding' | 'added' | 'error';

/**
 * Encapsulates the add-to-cart state machine used on the product detail page:
 * idle → adding → added (auto-resets after 2 s) | error.
 * Errors surface a localised message; the 'added' state is self-clearing so
 * the user can add the same item again without any extra interaction.
 */
interface UseAddToCartResult {
  addState: AddToCartState;
  addError: string | null;
  handleAddToCart: (options: AddItemInput) => Promise<void>;
}

export function useAddToCart(): UseAddToCartResult {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [addState, setAddState] = useState<AddToCartState>('idle');
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (addState !== 'added') return;
    const id = window.setTimeout(() => setAddState('idle'), 2000);
    return () => window.clearTimeout(id);
  }, [addState]);

  const handleAddToCart = useCallback(
    async (options: AddItemInput) => {
      setAddState('adding');
      setAddError(null);
      try {
        await addItem(options);
        setAddState('added');
      } catch (err) {
        setAddState('error');
        setAddError(err instanceof Error ? err.message : t('cart.addError'));
      }
    },
    [addItem, t],
  );

  return { addState, addError, handleAddToCart };
}
