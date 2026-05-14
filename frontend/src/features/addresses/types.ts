/**
 * Wire types for the buyer address book. Mirror the backend DTOs in
 * <c>Features/Addresses/AddressDtos.cs</c>.
 */

export interface BuyerAddressDto {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  governorate: string; // canonical slug — see locales/governorates.json
  city: string;
  streetAddress: string;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerAddressUpsertRequest {
  label: string;
  recipientName: string;
  phone: string;
  governorate: string;
  city: string;
  streetAddress: string;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  notes: string | null;
  setDefault: boolean;
}

/**
 * The 27 canonical Egyptian governorate slugs in the same order as the
 * backend's <c>Governorates.All</c>. Used to populate dropdowns.
 */
export const GOVERNORATE_SLUGS = [
  'alexandria',
  'aswan',
  'asyut',
  'beheira',
  'beni-suef',
  'cairo',
  'dakahlia',
  'damietta',
  'faiyum',
  'gharbia',
  'giza',
  'ismailia',
  'kafr-el-sheikh',
  'luxor',
  'matruh',
  'minya',
  'monufia',
  'new-valley',
  'north-sinai',
  'port-said',
  'qalyubia',
  'qena',
  'red-sea',
  'sharqia',
  'sohag',
  'south-sinai',
  'suez',
] as const;

export type GovernorateSlug = (typeof GOVERNORATE_SLUGS)[number];
