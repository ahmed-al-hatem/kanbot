export type StrengthLevel = 0 | 1 | 2 | 3;

export interface PasswordStrength {
  level: StrengthLevel;
  label: 'Too short' | 'Fair' | 'Good' | 'Strong';
}

const LABELS: PasswordStrength['label'][] = ['Too short', 'Fair', 'Good', 'Strong'];

/**
 * The register meter, with the canvas rules: under 8 characters is too short (the server
 * minimum), a digit makes it good, 12+ characters with a digit and a symbol make it strong.
 */
export function passwordStrength(password: string): PasswordStrength {
  let level: StrengthLevel = 1;
  if (password.length < 8) level = 0;
  else if (password.length >= 12 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) level = 3;
  else if (/\d/.test(password)) level = 2;
  return { level, label: LABELS[level] ?? 'Too short' };
}
