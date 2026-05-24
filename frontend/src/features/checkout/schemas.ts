import { z } from 'zod';

import { GOVERNORATE_SLUGS } from '../addresses/types';

/**
 * Shipping-address validation. Mirrors the backend's
 * <c>ShippingAddressValidator</c> in
 * <c>Features/Orders/Common/OrderValidators.cs</c>. Keep these symmetric.
 */
const phoneRegex = /^\+?\d[\d\s-]{8,18}\d$/;

export const shippingAddressSchema = z.object({
  recipientName: z
    .string()
    .min(2, 'checkout.errors.recipientNameTooShort')
    .max(100, 'checkout.errors.recipientNameTooLong'),
  phone: z
    .string()
    .min(8, 'checkout.errors.phoneRequired')
    .regex(phoneRegex, 'checkout.errors.phoneInvalid'),
  governorate: z
    .string()
    .refine(
      (value) => GOVERNORATE_SLUGS.includes(value as (typeof GOVERNORATE_SLUGS)[number]),
      'checkout.errors.governorateRequired',
    ),
  city: z
    .string()
    .min(2, 'checkout.errors.cityRequired')
    .max(100, 'checkout.errors.cityTooLong'),
  streetAddress: z
    .string()
    .min(5, 'checkout.errors.streetAddressRequired')
    .max(200, 'checkout.errors.streetAddressTooLong'),
  floor: z.string().max(50, 'checkout.errors.floorTooLong').optional().or(z.literal('')),
  apartment: z
    .string()
    .max(50, 'checkout.errors.apartmentTooLong')
    .optional()
    .or(z.literal('')),
  landmark: z
    .string()
    .max(200, 'checkout.errors.landmarkTooLong')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(500, 'checkout.errors.notesTooLong').optional().or(z.literal('')),
});

export type ShippingAddressForm = z.infer<typeof shippingAddressSchema>;

export const checkoutSchema = z.object({
  address: shippingAddressSchema,
  paymentMethodId: z.string().uuid('checkout.errors.paymentMethodRequired'),
  buyerNote: z.string().max(1000, 'checkout.errors.buyerNoteTooLong').optional(),
});

export type CheckoutForm = z.infer<typeof checkoutSchema>;
