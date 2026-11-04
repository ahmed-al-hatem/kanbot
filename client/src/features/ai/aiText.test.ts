import { describe, expect, it } from 'vitest';
import { formatDateTime, timeAgo } from '@/lib/format';
import { linkTodoKeys, stripInternalIds, todoKeysIn } from './aiText';

const KEYS = new Map([
  ['KAN-22', 'uuid-22'],
  ['KAN-7', 'uuid-7'],
]);

describe('AI text clean-up', () => {
  it('removes the internal [id:…] markers a model echoes back', () => {
    expect(stripInternalIds('KAN-22 [id:b36dbe33-b1e4-4c2a] is late; KAN-7 [id:x] too.')).toBe('KAN-22 is late; KAN-7 too.');
    expect(stripInternalIds('No ids here [link](https://example.com).')).toBe('No ids here [link](https://example.com).');
  });

  it('finds the todo keys a text mentions, once each', () => {
    expect(todoKeysIn('KAN-22, KAN-7 and KAN-22 again; not KAN-, kan-3 or K-1.')).toEqual(['KAN-22', 'KAN-7']);
  });

  it('links known keys outside code and existing links', () => {
    expect(linkTodoKeys('Start with KAN-22, then KAN-99.', KEYS)).toBe('Start with [KAN-22](#todo=uuid-22), then KAN-99.');
    expect(linkTodoKeys('Run `KAN-22` and\n```\nKAN-7\n```\nthen KAN-7', KEYS)).toBe(
      'Run `KAN-22` and\n```\nKAN-7\n```\nthen [KAN-7](#todo=uuid-7)',
    );
    expect(linkTodoKeys('See [KAN-22](https://example.com).', KEYS)).toBe('See [KAN-22](https://example.com).');
    // KAN-7 inside KAN-77 is not a match.
    expect(linkTodoKeys('KAN-77', KEYS)).toBe('KAN-77');
  });
});

describe('generated time', () => {
  const at = '2026-11-04T15:42:00.000Z';
  const now = new Date(at).getTime();

  it('formats date and time', () => {
    expect(formatDateTime(at)).toMatch(/^Nov \d{1,2}, 2026, \d{1,2}:\d{2}\s?[AP]M$/);
  });

  it('says how long ago', () => {
    expect(timeAgo(at, now + 20_000)).toBe('just now');
    expect(timeAgo(at, now - 5_000)).toBe('just now');
    expect(timeAgo(at, now + 2 * 60_000)).toBe('2 min ago');
    expect(timeAgo(at, now + 60 * 60_000)).toBe('1 hour ago');
    expect(timeAgo(at, now + 5 * 60 * 60_000)).toBe('5 hours ago');
    expect(timeAgo(at, now + 3 * 86_400_000)).toBe('3 days ago');
  });
});
