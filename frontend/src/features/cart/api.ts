import { api } from '../../shared/lib/api-client';

import type {
  AddCartItemRequest,
  CartDto,
  MergeCartRequest,
  UpdateCartItemRequest,
} from './types';

/**
 * Thin axios wrappers around the buyer cart slice. Every call requires a
 * signed-in user — the api-client's bearer token + refresh interceptor
 * handle session restoration silently.
 */
export const cartApi = {
  async get(): Promise<CartDto> {
    const { data } = await api.get<CartDto>('/cart');
    return data;
  },

  async add(input: AddCartItemRequest): Promise<CartDto> {
    const { data } = await api.post<CartDto>('/cart/items', input);
    return data;
  },

  async update(cartItemId: string, input: UpdateCartItemRequest): Promise<CartDto> {
    const { data } = await api.patch<CartDto>(`/cart/items/${cartItemId}`, input);
    return data;
  },

  async remove(cartItemId: string): Promise<CartDto> {
    const { data } = await api.delete<CartDto>(`/cart/items/${cartItemId}`);
    return data;
  },

  async clear(): Promise<CartDto> {
    const { data } = await api.post<CartDto>('/cart/clear');
    return data;
  },

  async merge(input: MergeCartRequest): Promise<CartDto> {
    const { data } = await api.post<CartDto>('/cart/merge', input);
    return data;
  },
};
