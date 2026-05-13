import { z } from 'zod';

/**
 * Client-side zod schemas. They MUST stay symmetric with the backend's
 * FluentValidation rules (RegisterValidator / LoginValidator). When either
 * side changes, the other has to change too — the matching error messages
 * live in locales/{ar,en}/auth.json.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.errors.emailRequired')
    .email('auth.errors.emailInvalid')
    .max(254, 'auth.errors.emailTooLong'),
  password: z
    .string()
    .min(1, 'auth.errors.passwordRequired')
    .max(128, 'auth.errors.passwordTooLong'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.errors.emailRequired')
    .email('auth.errors.emailInvalid')
    .max(254, 'auth.errors.emailTooLong'),
  password: z
    .string()
    .min(8, 'auth.errors.passwordTooShort')
    .max(128, 'auth.errors.passwordTooLong')
    .regex(/[a-z]/, 'auth.errors.passwordMissingLower')
    .regex(/[A-Z]/, 'auth.errors.passwordMissingUpper')
    .regex(/[0-9]/, 'auth.errors.passwordMissingDigit'),
  fullName: z
    .string()
    .min(2, 'auth.errors.fullNameTooShort')
    .max(120, 'auth.errors.fullNameTooLong'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
