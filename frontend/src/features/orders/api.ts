import { api } from '../../shared/lib/api-client';
import type { PagedResult } from '../../shared/types/paged-result';
import { appConfigApi } from '../app-config/api';

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
  getAppConfig: appConfigApi.getAppConfig,

  async getPaymentMethods(): Promise<PaymentMethodDto[]> {
    const { data } = await api.get<PaymentMethodDto[]>('/checkout/payment-methods');
    return data;
  },

  /**
   * Convert the signed-in buyer's cart into an order.
   * Maps to the backend's `POST /api/checkout` (MapPost("/") on the
   * /api/checkout route group), NOT `/api/checkout/` with trailing slash.
   * The backend route group is mounted at "/api/checkout" and the handler
   * is registered as MapPost("/"), so the effective path is "/api/checkout".
   */
  async createOrder(input: CreateOrderRequest, idempotencyKey?: string): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>('/checkout', input, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return data;
  },

  async listMyOrders(params?: { page?: number; pageSize?: number }): Promise<PagedResult<OrderSummaryDto>> {
    const { data } = await api.get<PagedResult<OrderSummaryDto>>('/orders', { params });
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
    // Important: do NOT set Content-Type manually here. Axios detects FormData
    // and emits `multipart/form-data; boundary=----WebKitFormBoundary…`. A manual
    // header without a boundary makes the server's multipart parser fail.
    const { data } = await api.post<OrderDetailDto>(
      `/orders/${encodeURIComponent(orderNumber)}/proof`,
      form,
    );
    return data;
  },

  async getPaymentProofFile(
    orderNumber: string,
    proofId: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const { data } = await api.get<Blob>(
      `/orders/${encodeURIComponent(orderNumber)}/proof/${encodeURIComponent(proofId)}/file`,
      { responseType: 'blob', signal },
    );
    return data;
  },
};
