import { api } from '../../shared/lib/api-client';
import type { NotificationPreferenceDto } from './types';

export const accountApi = {
  async getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    const { data } = await api.get<NotificationPreferenceDto>('/me/notification-preferences');
    return data;
  },

  async updateNotificationPreferences(dto: NotificationPreferenceDto): Promise<void> {
    await api.put('/me/notification-preferences', dto);
  },
};
