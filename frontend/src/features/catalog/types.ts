/**
 * Wire types for the apparel catalog. Mirror exactly the shapes returned
 * by `Features/Catalog/Common/CatalogDtos.cs`. Backend changes bump these.
 */

export type ProductGender = 0 | 1 | 2;

export const ProductGenderValues = {
  Men: 0 as ProductGender,
  Women: 1 as ProductGender,
  Unisex: 2 as ProductGender,
} as const;

export interface CategoryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  displayOrder: number;
}

export interface ProductImageDto {
  id: string;
  url: string;
  alt: string | null;
  displayOrder: number;
}

export interface ColorOption {
  name: string;
  nameAr: string;
  hex: string;
}

export interface ProductVariantDto {
  id: string;
  size: string;
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sku: string;
  stock: number;
  isActive: boolean;
}

export interface ProductSummaryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price: number;
  gender: ProductGender;
  brand: string | null;
  primaryImageUrl: string | null;
  /** Distinct sizes that have at least one in-stock active variant. */
  availableSizes: string[];
  /** Distinct colours that have at least one in-stock active variant. */
  availableColors: ColorOption[];
  /** Total stock across all active variants. */
  totalStock: number;
  category: CategoryDto;
}

export interface ProductDetailDto {
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
  createdAt: string;
  category: CategoryDto;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type ProductSort = 'Newest' | 'PriceAsc' | 'PriceDesc' | 'NameAsc';

export interface ProductFilter {
  categoryId?: string;
  q?: string;
  gender?: ProductGender;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}
