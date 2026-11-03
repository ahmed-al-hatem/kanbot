import { expect } from 'vitest';
import { configureAxe } from 'vitest-axe';

/*
 * jsdom has no layout or canvas, so axe can't compute contrast (checked against the
 * DESIGN.md token table and in Lighthouse instead), and a component rendered on its own
 * is not a page, so the landmark rule doesn't apply.
 */
const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
});

/** Fails with the rule ids and help texts of every axe violation inside `element`. */
export async function expectNoAxeViolations(element: Element) {
  const { violations } = await axe(element);
  expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}
