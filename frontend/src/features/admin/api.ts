import { api } from '../../shared/lib/api-client';
import type {
  OrderDetailDto,
  OrderStatus,
  OrderSummaryDto,
} from '../orders/types';

/**
 * Admin-only counterparts of the buyer order endpoints. Every call goes to
 * <c>/api/admin/orders/*</c> which the backend protects with
 * <c>RequireRole(Admin)</c>. The bearer-token interceptor handles auth.
 */
export const adminOrdersApi = {
  async list(params?: {
    status?: OrderStatus;
    page?: number;
    pageSize?: number;
  }): Promise<OrderSummaryDto[]> {
    const { data } = await api.get<OrderSummaryDto[]>('/admin/orders', { params });
    return data;
  },

  async get(orderNumber: string): Promise<OrderDetailDto> {
    const { data } = await api.get<OrderDetailDto>(
      `/admin/orders/${encodeURIComponent(orderNumber)}`,
    );
    return data;
  },

  async transition(
    orderNumber: string,
    body: { toStatus: OrderStatus; reason?: string | null },
  ): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>(
      `/admin/orders/${encodeURIComponent(orderNumber)}/transition`,
      body,
    );
    return data;
  },

  async approveProof(
    orderNumber: string,
    proofId: string,
    body: { reviewNote?: string | null },
  ): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>(
      `/admin/orders/${encodeURIComponent(orderNumber)}/proof/${proofId}/approve`,
      body,
    );
    return data;
  },

  async rejectProof(
    orderNumber: string,
    proofId: string,
    body: { reviewNote: string },
  ): Promise<OrderDetailDto> {
    const { data } = await api.post<OrderDetailDto>(
      `/admin/orders/${encodeURIComponent(orderNumber)}/proof/${proofId}/reject`,
      body,
    );
    return data;
  },
};
