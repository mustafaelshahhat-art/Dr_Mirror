import { api } from '../../shared/lib/api-client';
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
  }): Promise<InquiryDto[]> {
    const { data } = await api.get<InquiryDto[]>('/admin/inquiries', { params });
    return data;
  },

  async adminMarkRead(inquiryId: string): Promise<InquiryDto> {
    const { data } = await api.post<InquiryDto>(`/admin/inquiries/${inquiryId}/read`);
    return data;
  },
};
