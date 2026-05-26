import { api } from '../../shared/lib/api-client';
import type { PagedResult } from '../../shared/types/paged-result';
import type { WhatsAppAttemptDto, WhatsAppStatusDto } from './types';
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
  buyerPhone: string | null;
  reviewedByAdminName: string | null;
  itemCount: number;
  totalValue: number;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingGovernorate: string;
  shippingCity: string;
  shippingStreetAddress: string;
  shippingFloor: string | null;
  shippingApartment: string | null;
  shippingLandmark: string | null;
  shippingNotes: string | null;
  orderSubTotal: number;
  orderShippingFee: number;
  orderTotal: number;
  paymentMethodNameEn: string;
  paymentMethodNameAr: string;
  paymentStatusLabel: string;
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

  async getReturn(returnId: string): Promise<AdminReturnRequestDto> {
    const { data } = await api.get<AdminReturnRequestDto>(
      `/admin/orders/returns/${encodeURIComponent(returnId)}`,
    );
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

export const adminWhatsAppApi = {
  async getWhatsAppStatus(): Promise<WhatsAppStatusDto> {
    const { data } = await api.get<WhatsAppStatusDto>('/admin/whatsapp/status');
    return data;
  },

  async getWhatsAppAttempts(page: number, limit: number): Promise<PagedResult<WhatsAppAttemptDto>> {
    const { data } = await api.get<PagedResult<WhatsAppAttemptDto>>('/admin/whatsapp/attempts', {
      params: { page, limit },
    });
    return data;
  },

  async getWhatsAppQr(): Promise<{ qrDataUri: string | null }> {
    const { data } = await api.get<{ qrDataUri: string | null }>('/admin/whatsapp/qr');
    return data;
  },

  async disconnectWhatsApp(): Promise<void> {
    await api.post('/admin/whatsapp/disconnect');
  },

  async retryAttempt(id: string): Promise<{ originalId: string; retryId: string }> {
    const { data } = await api.post<{ originalId: string; retryId: string }>(
      `/admin/whatsapp/attempts/${encodeURIComponent(id)}/retry`,
    );
    return data;
  },

  async retryAllFailed(): Promise<{ queued: number }> {
    const { data } = await api.post<{ queued: number }>('/admin/whatsapp/attempts/retry-all-failed');
    return data;
  },
};
