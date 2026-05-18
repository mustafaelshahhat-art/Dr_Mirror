// Placeholder feature module — public app-config endpoint scaffold.
// Wiring (provider + hook + consumer) lands with the runtime feature-flag
// work tracked under the next branch.
import { api } from '../../shared/lib/api-client';
import type { AppConfigDto } from './types';

export const appConfigApi = {
  async getAppConfig(): Promise<AppConfigDto> {
    const { data } = await api.get<AppConfigDto>('/app-config');
    return data;
  },
};
