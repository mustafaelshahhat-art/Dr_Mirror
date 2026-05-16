export const ALL_ROLES = ['Admin', 'Vendor', 'Buyer'] as const;
export type UserRole = (typeof ALL_ROLES)[number];

export interface AdminUserDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isDisabled: boolean;
  createdAt: string;
  roles: UserRole[];
}
