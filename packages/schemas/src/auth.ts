import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 60;

export const emailSchema = z
  .string({ error: 'email_required' })
  .trim()
  .toLowerCase()
  .max(254, { error: 'email_invalid' })
  .pipe(z.email({ error: 'email_invalid' }));

export const newPasswordSchema = z
  .string({ error: 'password_required' })
  .min(PASSWORD_MIN_LENGTH, { error: 'password_too_short' })
  .max(PASSWORD_MAX_LENGTH, { error: 'password_too_long' });

export const displayNameSchema = z
  .string({ error: 'display_name_required' })
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH, { error: 'display_name_too_short' })
  .max(DISPLAY_NAME_MAX_LENGTH, { error: 'display_name_too_long' });

export const signUpSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  displayName: displayNameSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'password_required' })
    .min(1, { error: 'password_required' })
    .max(PASSWORD_MAX_LENGTH, { error: 'password_too_long' }),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  role: z.enum(['user', 'moderator', 'admin']),
  locale: z.enum(['pt_BR', 'en', 'es']),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUp = z.output<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type SignIn = z.output<typeof signInSchema>;
export type AuthUser = z.output<typeof authUserSchema>;
