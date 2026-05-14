/**
 * Wire types for the admin catalog slice. Mirror the backend DTOs in
 * `Features/Admin/Catalog/*` exactly — never let them drift.
 */

import type { ProductGender } from '../../catalog/types';
import type { PaymentMethodKind } from '../../orders/types';

export interface AdminCategoryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategoryUpsertRequest {
  nameAr: string;
  nameEn: string;
  displayOrder: number;
}

export interface AdminProductImageDto {
  id: string;
  url: string;
  alt: string | null;
  displayOrder: number;
  fileKey: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface AdminProductVariantDto {
  id: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sku: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductSummaryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price: number;
  gender: ProductGender;
  isPublished: boolean;
  categoryId: string;
  categoryNameEn: string;
  categoryNameAr: string;
  variantCount: number;
  totalStock: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetailDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  gender: ProductGender;
  material: string | null;
  brand: string | null;
  sku: string | null;
  isPublished: boolean;
  categoryId: string;
  categoryNameEn: string;
  categoryNameAr: string;
  variants: AdminProductVariantDto[];
  images: AdminProductImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductCreateRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  gender: ProductGender;
  material: string | null;
  brand: string | null;
  sku: string | null;
  categoryId: string;
}

export interface AdminProductUpdateRequest extends AdminProductCreateRequest {}

export interface AdminVariantUpsertRequest {
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sku: string;
  stock: number;
}

export interface AdminProductImageUpdateRequest {
  alt: string | null;
  displayOrder: number;
}

export interface AdminProductsListParams {
  q?: string;
  categoryId?: string;
  gender?: ProductGender;
  published?: boolean;
}

// -----------------------------------------------------------------------------
// Payment methods
// -----------------------------------------------------------------------------

export interface AdminPaymentMethodDto {
  id: string;
  code: string;
  kind: PaymentMethodKind;
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  isActive: boolean;
  displayOrder: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentMethodCreateRequest {
  code: string;
  kind: PaymentMethodKind;
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  displayOrder: number;
}

export interface AdminPaymentMethodUpdateRequest {
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  displayOrder: number;
}
