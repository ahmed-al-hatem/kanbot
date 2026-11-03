import { z } from 'zod';

/*
 * Client rules mirror the server's zod schemas (server/src/routes/auth.routes.ts), so a value
 * the client accepts is never rejected by the API (plan §2 #12). Messages follow the canvas.
 */

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email, like name@example.com'));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
});

export type LoginValues = z.input<typeof loginSchema>;

const registerFields = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Use 80 characters or fewer'),
  email: emailField,
  password: z.string().min(8, 'Use at least 8 characters').max(200, 'Use 200 characters or fewer'),
  confirm: z.string().min(1, 'Confirm your password'),
});

const passwordPair = z.object({ password: z.string(), confirm: z.string().min(1) });

export const registerSchema = registerFields.refine((values) => values.password === values.confirm, {
  path: ['confirm'],
  message: 'Passwords do not match',
  // zod skips object refinements once any field fails; still compare the two passwords then.
  when: (payload) => passwordPair.safeParse(payload.value).success,
});

export type RegisterValues = z.input<typeof registerSchema>;

export const forgotSchema = z.object({ email: emailField });

export type ForgotValues = z.input<typeof forgotSchema>;
