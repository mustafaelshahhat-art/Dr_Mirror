import { api } from '../../shared/lib/api-client';

import type { GovernorateDto } from './types';

export const checkoutApi = {
  async getGovernorates(): Promise<GovernorateDto[]> {
    const { data } = await api.get<GovernorateDto[]>('/shipping/governorates');
    return data;
  },
};
