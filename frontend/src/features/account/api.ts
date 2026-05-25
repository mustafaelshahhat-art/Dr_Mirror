import { api } from '../../shared/lib/api-client';
import type {
  AccountProfileDto,
  ChangePasswordRequest,
  NotificationPreferenceDto,
  OtpPurpose,
  OtpSendStatusResponse,
  SendOtpResponse,
  UpdateProfileRequest,
  VerifyOtpResponse,
} from './types';

export const accountApi = {
  async getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    const { data } = await api.get<NotificationPreferenceDto>('/me/notification-preferences');
    return data;
  },

  async updateNotificationPreferences(dto: NotificationPreferenceDto): Promise<void> {
    await api.put('/me/notification-preferences', dto);
  },

  async getProfile(): Promise<AccountProfileDto> {
    const { data } = await api.get<AccountProfileDto>('/account/profile');
    return data;
  },

  async updateProfile(dto: UpdateProfileRequest): Promise<AccountProfileDto> {
    const { data } = await api.patch<AccountProfileDto>('/account/profile', dto);
    return data;
  },

  async sendOtp(purpose: OtpPurpose): Promise<SendOtpResponse> {
    const { data } = await api.post<SendOtpResponse>('/account/phone/verify/send', { purpose });
    return data;
  },

  async getOtpSendStatus(sessionId: string): Promise<OtpSendStatusResponse> {
    const { data } = await api.get<OtpSendStatusResponse>(`/account/phone/verify/send-status/${encodeURIComponent(sessionId)}`);
    return data;
  },

  async verifyOtp(purpose: OtpPurpose, code: string): Promise<VerifyOtpResponse> {
    const { data } = await api.post<VerifyOtpResponse>('/account/phone/verify', { purpose, code });
    return data;
  },

  async changePassword(dto: ChangePasswordRequest): Promise<void> {
    await api.post('/account/password', dto);
  },
};
