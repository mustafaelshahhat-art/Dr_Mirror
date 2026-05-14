import { api } from '../../shared/lib/api-client';

import type { BuyerAddressDto, BuyerAddressUpsertRequest } from './types';

export const addressApi = {
  async list(): Promise<BuyerAddressDto[]> {
    const { data } = await api.get<BuyerAddressDto[]>('/addresses');
    return data;
  },

  async create(body: BuyerAddressUpsertRequest): Promise<BuyerAddressDto> {
    const { data } = await api.post<BuyerAddressDto>('/addresses', body);
    return data;
  },

  async update(id: string, body: BuyerAddressUpsertRequest): Promise<BuyerAddressDto> {
    const { data } = await api.put<BuyerAddressDto>(`/addresses/${id}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  async setDefault(id: string): Promise<BuyerAddressDto> {
    const { data } = await api.post<BuyerAddressDto>(`/addresses/${id}/set-default`);
    return data;
  },
};
