import { z } from 'zod';
import type { Messages } from '@/i18n';

/*
 * Client rules mirror the server's zod schemas (server/src/routes/auth.routes.ts), so a value
 * the client accepts is never rejected by the API (plan §2 #12). Messages follow the canvas.
 *
 * Each schema is a factory of the UI language's messages (`useMemo(() => loginSchema(t), [t])`),
 * so validation speaks the current language; `useLocalizedErrors` re-validates the fields showing
 * an error after a switch.
 */

function emailField(t: Messages) {
  return z
    .string()
    .trim()
    .min(1, t.auth.validation.emailRequired)
    .pipe(z.email(t.auth.validation.emailInvalid));
}

export function loginSchema(t: Messages) {
  return z.object({
    email: emailField(t),
    password: z.string().min(1, t.auth.validation.passwordRequired),
  });
}

export type LoginValues = z.input<ReturnType<typeof loginSchema>>;

const passwordPair = z.object({ password: z.string(), confirm: z.string().min(1) });

export function registerSchema(t: Messages) {
  const { validation } = t.auth;
  return z
    .object({
      name: z.string().trim().min(1, validation.nameRequired).max(80, t.validation.maxChars(80)),
      email: emailField(t),
      password: z.string().min(8, validation.passwordMin).max(200, t.validation.maxChars(200)),
      confirm: z.string().min(1, validation.confirmRequired),
    })
    .refine((values) => values.password === values.confirm, {
      path: ['confirm'],
      message: validation.passwordMismatch,
      // zod skips object refinements once any field fails; still compare the two passwords then.
      when: (payload) => passwordPair.safeParse(payload.value).success,
    });
}

export type RegisterValues = z.input<ReturnType<typeof registerSchema>>;

export function forgotSchema(t: Messages) {
  return z.object({ email: emailField(t) });
}

export type ForgotValues = z.input<ReturnType<typeof forgotSchema>>;
