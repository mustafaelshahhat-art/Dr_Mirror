/**
 * Pending integration point: DTOs for the `/api/app-config` endpoint.
 * Currently consumed via re-export through `orders/types` and queried via
 * `ordersApi.getAppConfig`. A future task may extract a dedicated
 * `useAppConfig` hook into this feature directory.
 */
export interface PaymentProofUploadConfigDto {
  maxFileSizeBytes: number;
}

export interface SupportConfigDto {
  contactEmail: string | null;
}

export interface AppConfigDto {
  paymentProofUpload: PaymentProofUploadConfigDto;
  support: SupportConfigDto;
}
