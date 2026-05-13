import { api } from '../../shared/lib/api-client';

import type {
  CancelOrderRequest,
  CreateOrderRequest,
  OrderDetailDto,
  OrderSummaryDto,
  PaymentMethodDto,
} from './types';

/**
 * Thin axios wrappers around the buyer-facing checkout + orders slices.
 * Every call requires a signed-in buyer — the api-client's bearer token
 * and refresh interceptor handle session restoration silently.
 */
export const ordersApi = {
  async getPaymentMethods(): Promise<PaymentMethodDto[]> {
    const { data } = await api.get<PaymentMethodDto[]>('/checkout/payment-methods');
    return data;
  },

  async createOrder(input: CreateOrderRequest): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>('/checkout', input);
    return data;
  },

  async listMyOrders(params?: { page?: number; pageSize?: number }): Promise<OrderSummaryDto[]> {
    const { data } = await api.get<OrderSummaryDto[]>('/orders', { params });
    return data;
  },

  async getMyOrder(orderNumber: string): Promise<OrderDetailDto> {
    const { data } = await api.get<OrderDetailDto>(
      `/orders/${encodeURIComponent(orderNumber)}`,
    );
    return data;
  },

  async cancelMyOrder(orderNumber: string, body: CancelOrderRequest): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>(
      `/orders/${encodeURIComponent(orderNumber)}/cancel`,
      body,
    );
    return data;
  },

  /**
   * Upload a payment-proof image (multipart). The backend stores it via
   * <c>IFileStorageService</c> and bumps the order to PendingPaymentReview.
   */
  async uploadPaymentProof(orderNumber: string, file: File): Promise<OrderDetailDto> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<OrderDetailDto>(
      `/orders/${encodeURIComponent(orderNumber)}/proof`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data;
  },
};
