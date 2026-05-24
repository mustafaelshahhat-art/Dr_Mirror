import { api } from '../../shared/lib/api-client';
import type { PagedResult } from '../../shared/types/paged-result';
import { appConfigApi } from '../app-config/api';

import type {
  CancelOrderRequest,
  CreateOrderRequest,
  OrderDetailDto,
  ReturnRequestDto,
  SubmitReturnRequest,
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
    // The shared axios instance defaults to `Content-Type: application/json`.
    // Setting Content-Type to undefined for this request lets the browser/axios
    // emit the correct `multipart/form-data; boundary=…` from the FormData body
    // — without this the server gets `application/json` and rejects with 415.
    const { data } = await api.post<OrderDetailDto>(
      `/orders/${encodeURIComponent(orderNumber)}/proof`,
      form,
      { headers: { 'Content-Type': undefined } },
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

  async listReturns(orderNumber: string): Promise<ReturnRequestDto[]> {
    const { data } = await api.get<ReturnRequestDto[]>(
      `/orders/${encodeURIComponent(orderNumber)}/returns`,
    );
    return data;
  },

  async submitReturn(orderNumber: string, body: SubmitReturnRequest): Promise<ReturnRequestDto> {
    const { data } = await api.post<ReturnRequestDto>(
      `/orders/${encodeURIComponent(orderNumber)}/returns`,
      body,
    );
    return data;
  },

  async cancelReturn(orderNumber: string, returnId: string): Promise<ReturnRequestDto> {
    const { data } = await api.delete<ReturnRequestDto>(
      `/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnId)}`,
    );
    return data;
  },
};
