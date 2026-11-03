/**
 * CSS rules from CLAUDE.md that ESLint can't see (runs as part of `npm run lint`):
 * - hex colors only in src/styles/tokens.css;
 * - logical properties only (margin-inline-start, not margin-left).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const TOKENS = join('styles', 'tokens.css');

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const PHYSICAL =
  /(?:^|[\s;{])(?:(?:margin|padding|border)-(?:left|right|top|bottom)\b|(?:left|right|top|bottom|width|height|min-width|min-height|max-width|max-height)\s*:)|text-align:\s*(?:left|right)/;

const problems = [];

for (const file of readdirSync(root, { recursive: true })) {
  if (!file.endsWith('.css')) continue;
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const where = `src${sep}${file}:${i + 1}`;
    if (file !== TOKENS && HEX.test(line)) {
      problems.push(`${where}  hex color — use a var() from styles/tokens.css`);
    }
    if (PHYSICAL.test(line)) {
      problems.push(`${where}  physical property — use the logical one (inline/block)`);
    }
  });
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(`\n✖ ${problems.length} CSS problem(s) in ${relative(process.cwd(), root)}`);
  process.exit(1);
}
console.log('✓ CSS: no hex colors outside tokens.css, logical properties only');
