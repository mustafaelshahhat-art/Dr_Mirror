import { api } from '../../shared/lib/api-client';
import type { PagedResult } from '../../shared/types/paged-result';
import type {
  OrderDetailDto,
  OrderStatus,
  ReturnRequestDto,
  ReturnStatus,
  OrderSummaryDto,
} from '../orders/types';

export interface AdminReturnRequestDto extends ReturnRequestDto {
  buyerFullName: string;
  buyerEmail: string | null;
  reviewedByAdminName: string | null;
  itemCount: number;
  totalValue: number;
}

export interface OrderStatsResponse {
  totalOrders: number;
  countsByStatus: Record<string, number>;
}

/**
 * Admin-only counterparts of the buyer order endpoints. Every call goes to
 * <c>/api/admin/orders/*</c> which the backend protects with
 * <c>RequireRole(Admin)</c>. The bearer-token interceptor handles auth.
 */
export const adminOrdersApi = {
  async stats(): Promise<OrderStatsResponse> {
    const { data } = await api.get<OrderStatsResponse>('/admin/orders/stats');
    return data;
  },

  async list(params?: {
    status?: OrderStatus;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<OrderSummaryDto>> {
    const { data } = await api.get<PagedResult<OrderSummaryDto>>('/admin/orders', { params });
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

export const adminReturnsApi = {
  async listReturns(params?: {
    status?: ReturnStatus;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<AdminReturnRequestDto>> {
    const { data } = await api.get<PagedResult<AdminReturnRequestDto>>('/admin/orders/returns', { params });
    return data;
  },

  async transitionReturn(
    orderNumber: string,
    returnId: string,
    body: { action: 'Approve' | 'Reject' | 'MarkReceived' | 'Complete'; adminNote?: string | null },
  ): Promise<AdminReturnRequestDto> {
    const { data } = await api.post<AdminReturnRequestDto>(
      `/admin/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnId)}/transitions`,
      body,
    );
    return data;
  },
};
