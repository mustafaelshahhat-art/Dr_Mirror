export interface NotificationPreferenceDto {
  whatsAppEnabled: boolean;
}

export interface AccountProfileDto {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
}

export type OtpPurpose = 'profile' | 'checkout';

export type OtpSendStatus = 'sending' | 'sent' | 'failed';

export interface SendOtpResponse {
  sessionId: string;
  maskedPhone: string;
  cooldownSeconds: number;
  resendsRemaining: number;
  status: OtpSendStatus;
}

export interface OtpSendStatusResponse {
  status: OtpSendStatus;
  message: string;
  canRetry: boolean;
}

export interface VerifyOtpResponse {
  verified: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
