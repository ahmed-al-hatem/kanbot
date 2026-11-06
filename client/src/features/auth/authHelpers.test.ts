import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/messages/en';
import { passwordStrength } from './passwordStrength';
import { loginPath, safeRedirect, withRedirect } from './redirect';
import { registerSchema } from './schemas';

describe('safeRedirect()', () => {
  it.each([
    ['/projects/p1/board?todo=t1', '/projects/p1/board?todo=t1'],
    [null, '/projects'],
    ['', '/projects'],
    ['projects', '/projects'],
    ['//evil.example', '/projects'],
    ['/\\evil.example', '/projects'],
    ['https://evil.example', '/projects'],
    ['/login?redirect=%2Fx', '/projects'],
    ['/register', '/projects'],
  ])('%s → %s', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected);
  });
});

describe('loginPath() / withRedirect()', () => {
  it('encodes the page to come back to, and skips the root', () => {
    expect(loginPath('/projects/p1/board?todo=t1')).toBe(
      '/login?redirect=%2Fprojects%2Fp1%2Fboard%3Ftodo%3Dt1',
    );
    expect(loginPath('/')).toBe('/login');
    expect(loginPath()).toBe('/login');
  });

  it('carries ?redirect= between guest pages', () => {
    expect(withRedirect('/register', new URLSearchParams('redirect=/projects/p1'))).toBe(
      '/register?redirect=%2Fprojects%2Fp1',
    );
    expect(withRedirect('/register', new URLSearchParams())).toBe('/register');
  });
});

describe('passwordStrength()', () => {
  it.each([
    ['', 'Too short'],
    ['abc1234', 'Too short'],
    ['abcdefgh', 'Fair'],
    ['password1', 'Good'],
    ['long-password-1', 'Strong'],
    ['longpassword12', 'Good'],
  ])('%s → %s', (password, label) => {
    expect(en.auth.register.strength[passwordStrength(password).key]).toBe(label);
  });
});

describe('registerSchema', () => {
  const valid = {
    name: 'Sara',
    email: 'sara@example.com',
    password: 'password123',
    confirm: 'password123',
  };

  it('accepts valid values and trims name and email', () => {
    expect(
      registerSchema(en).parse({ ...valid, name: '  Sara ', email: ' sara@example.com ' }),
    ).toMatchObject({
      name: 'Sara',
      email: 'sara@example.com',
    });
  });

  it('reports a password mismatch even while other fields are invalid', () => {
    const result = registerSchema(en).safeParse({ ...valid, name: '', confirm: 'password12' });
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['name', 'confirm']));
  });

  it('follows the server limits', () => {
    const result = registerSchema(en).safeParse({
      ...valid,
      name: 'x'.repeat(81),
      password: 'short',
      confirm: 'short',
    });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['Use 80 characters or fewer', 'Use at least 8 characters']),
    );
  });
});
