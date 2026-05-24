import { api } from '../../../shared/lib/api-client';

import type {
  AdminGovernorateShippingFeeDto,
  AdminGovernorateShippingFeeUpdateRequest,
} from './types';

export const adminShippingApi = {
  async listGovernorates(): Promise<AdminGovernorateShippingFeeDto[]> {
    const { data } = await api.get<AdminGovernorateShippingFeeDto[]>('/admin/shipping/governorates');
    return data;
  },

  async updateGovernorate(
    id: string,
    body: AdminGovernorateShippingFeeUpdateRequest,
  ): Promise<AdminGovernorateShippingFeeDto> {
    const { data } = await api.put<AdminGovernorateShippingFeeDto>(
      `/admin/shipping/governorates/${id}`,
      body,
    );
    return data;
  },
};
