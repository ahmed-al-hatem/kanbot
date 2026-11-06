import { intlTag, type Locale } from './config';

/**
 * The plural categories of `Intl.PluralRules`. English uses `one` / `other`; Arabic uses all six:
 * zero (0), one (1), two (2), few (3–10, 103–110…), many (11–99, 111–199…), other (100, 101, 102…).
 * Only `other` is required: a missing form falls back to it.
 */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

const rules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  let rule = rules.get(locale);
  if (!rule) {
    rule = new Intl.PluralRules(intlTag(locale));
    rules.set(locale, rule);
  }
  return rule;
}

export function pluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  return rulesFor(locale).select(count);
}

/** The form of `forms` that `count` takes in `locale`. */
export function plural(locale: Locale, count: number, forms: PluralForms): string {
  return forms[pluralCategory(locale, count)] ?? forms.other;
}
