import { z } from 'zod';
import { PROJECT_KEY_PATTERN } from '@/lib/projectKey';

const KEY_MESSAGE = 'Key must be 2–6 letters';

/**
 * Same limits as the server's create/update schemas (plan §2 #12): name 1–80, key 2–6
 * letters (uppercased), description ≤ 500. Creating, the key is optional — the server
 * generates one; editing, it must stay a valid key (PRJ-3).
 */
export function projectFormSchema(mode: 'create' | 'edit') {
  const key = z.string().trim().toUpperCase();
  return z.object({
    name: z.string().trim().min(1, 'Give your project a name').max(80, 'Use 80 characters or fewer'),
    key:
      mode === 'create'
        ? key.refine((value) => value === '' || PROJECT_KEY_PATTERN.test(value), KEY_MESSAGE)
        : key.regex(PROJECT_KEY_PATTERN, KEY_MESSAGE),
    description: z.string().trim().max(500, 'Use 500 characters or fewer'),
  });
}

export type ProjectFormValues = z.infer<ReturnType<typeof projectFormSchema>>;
