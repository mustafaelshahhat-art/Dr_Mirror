export interface AdminGovernorateShippingFeeDto {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  fee: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminGovernorateShippingFeeUpdateRequest {
  fee: number;
  isActive: boolean;
}
