import { describe, expect, it } from 'vitest';
import { generatedKey, keyFromName, normalizeKey, PROJECT_KEY_PATTERN } from './projectKey';

describe('keyFromName (mirrors the server)', () => {
  it.each([
    ['Mobile App Redesign', 'MAR'],
    ['Kanbot', 'KAN'],
    ['one two three four five', 'OTTF'],
    ['  kanbot   mobile ', 'KM'],
    ['Q3-launch plan', 'QLP'],
    ['A', 'PRJ'],
    ['123', 'PRJ'],
    ['', 'PRJ'],
  ])('%j → %s', (name, key) => {
    expect(keyFromName(name)).toBe(key);
  });
});

describe('generatedKey', () => {
  it('appends A, B… while the key is taken, like POST /projects', () => {
    expect(generatedKey('Kanbot', [])).toBe('KAN');
    expect(generatedKey('Kanbot', ['KAN'])).toBe('KANA');
    expect(generatedKey('Kanbot', ['KAN', 'KANA', 'KANB'])).toBe('KANC');
  });
});

describe('normalizeKey', () => {
  it('uppercases and trims; the pattern then accepts 2–6 letters only', () => {
    expect(normalizeKey(' kan ')).toBe('KAN');
    expect(PROJECT_KEY_PATTERN.test('KAN')).toBe(true);
    expect(PROJECT_KEY_PATTERN.test('K')).toBe(false);
    expect(PROJECT_KEY_PATTERN.test('KANBOTX')).toBe(false);
    expect(PROJECT_KEY_PATTERN.test('KAN1')).toBe(false);
  });
});
