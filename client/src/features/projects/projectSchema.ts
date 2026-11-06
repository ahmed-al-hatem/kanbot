import { z } from 'zod';
import type { Messages } from '@/i18n';
import { PROJECT_KEY_PATTERN } from '@/lib/projectKey';

/**
 * Same limits as the server's create/update schemas (plan §2 #12): name 1–80, key 2–6
 * letters (uppercased), description ≤ 500. Creating, the key is optional — the server
 * generates one; editing, it must stay a valid key (PRJ-3). Messages come from `t`, so the
 * schema is built per language (see auth/schemas.ts).
 */
export function projectFormSchema(mode: 'create' | 'edit', t: Messages) {
  const { form } = t.projects;
  const key = z.string().trim().toUpperCase();
  return z.object({
    name: z.string().trim().min(1, form.nameRequired).max(80, t.validation.maxChars(80)),
    key:
      mode === 'create'
        ? key.refine((value) => value === '' || PROJECT_KEY_PATTERN.test(value), form.keyInvalid)
        : key.regex(PROJECT_KEY_PATTERN, form.keyInvalid),
    description: z.string().trim().max(500, t.validation.maxChars(500)),
  });
}

export type ProjectFormValues = z.infer<ReturnType<typeof projectFormSchema>>;
