import { api } from '../../shared/lib/api-client';
import type { PagedResult } from '../../shared/types/paged-result';
import type { InquiryDto, InquiryStatus, SubmitInquiryRequest } from './types';

export const inquiriesApi = {
  async submit(body: SubmitInquiryRequest): Promise<InquiryDto> {
    const { data } = await api.post<InquiryDto>('/inquiries', body);
    return data;
  },

  async adminList(params?: {
    status?: InquiryStatus;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<InquiryDto>> {
    const { data } = await api.get<PagedResult<InquiryDto>>('/admin/inquiries', { params });
    return data;
  },

  async adminMarkRead(inquiryId: string): Promise<InquiryDto> {
    const { data } = await api.post<InquiryDto>(`/admin/inquiries/${inquiryId}/read`);
    return data;
  },

  async adminMarkResponded(inquiryId: string): Promise<InquiryDto> {
    const { data } = await api.post<InquiryDto>(`/admin/inquiries/${inquiryId}/respond`);
    return data;
  },
};
