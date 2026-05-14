export type InquiryStatus = 0 | 1 | 2; // New | Read | Responded

export const INQUIRY_STATUS = {
  New: 0,
  Read: 1,
  Responded: 2,
} as const satisfies Record<string, InquiryStatus>;

export interface InquiryDto {
  id: string;
  productId: string | null;
  productNameEn: string | null;
  productNameAr: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  readAt: string | null;
  readByUserName: string | null;
}

export interface SubmitInquiryRequest {
  productId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}
