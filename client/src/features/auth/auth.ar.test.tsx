import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ar } from '@/i18n/messages/ar';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';

/** Arabic (R2): the auth pages read every string from ar.ts, validation and server errors included. */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

beforeEach(() => {
  server.use(...projectHandlers());
});

describe('login in Arabic', () => {
  it('validates in Arabic and passes axe', async () => {
    await switchToArabic();
    const user = userEvent.setup();
    const { container } = renderApp('/login');

    expect(
      await screen.findByRole('heading', { name: 'أهلًا بعودتك', level: 1 }),
    ).toBeInTheDocument();
    expect(document.title).toBe('تسجيل الدخول · Kanbot');
    expect(screen.getByRole('group', { name: 'اللغة' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^التبديل إلى الوضع (الفاتح|الداكن)$/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    const email = screen.getByLabelText('البريد الإلكتروني');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('أدخل بريدك الإلكتروني');
    });
    expect(screen.getByLabelText('كلمة المرور')).toHaveAccessibleDescription('أدخل كلمة المرور');
    expect(email).toHaveFocus();
    expect(screen.getByTestId('live-polite')).toHaveTextContent('حقلان يحتاجان إلى انتباه');

    await user.type(email, 'not-an-email');
    await user.tab();
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('أدخل بريدًا صالحًا، مثل name@example.com');
    });
    await expectNoAxeViolations(container);
  });

  it('keeps the email and password left to right in the RTL page', async () => {
    await switchToArabic();
    renderApp('/login');

    const email = await screen.findByLabelText('البريد الإلكتروني');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(email).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('كلمة المرور')).toHaveAttribute('dir', 'ltr');
  });

  it('shows the 401 banner in Arabic, never the server English', async () => {
    await switchToArabic();
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        HttpResponse.json(errorBody('UNAUTHORIZED', 'Incorrect email or password.'), {
          status: 401,
        }),
      ),
    );
    const { container } = renderApp('/login');

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'sara@example.com');
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(ar.auth.login.invalidCredentials);
    expect(banner).not.toHaveTextContent('Incorrect');
    const password = screen.getByLabelText('كلمة المرور');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription(ar.auth.login.invalidCredentials);
    await expectNoAxeViolations(container);
  });

  it('shows the session-expired banner in Arabic', async () => {
    await switchToArabic();
    useSession.setState({ sessionExpired: true });
    renderApp('/login');

    const banner = await screen.findByText('انتهت صلاحية جلستك. سجّل الدخول مجددًا.');
    expect(banner.closest('[role="status"]')).not.toBeNull();
  });

  it('a rate limit says so in Arabic', async () => {
    await switchToArabic();
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        HttpResponse.json(
          errorBody('RATE_LIMITED', 'Too many attempts. Try again in a few minutes.'),
          {
            status: 429,
          },
        ),
      ),
    );
    renderApp('/login');

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'sara@example.com');
    await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(ar.errors.server.RATE_LIMITED(''));
  });
});

describe('register in Arabic', () => {
  it('puts a 409 under the email in Arabic and passes axe', async () => {
    await switchToArabic();
    const user = userEvent.setup();
    const message = 'An account with this email already exists.';
    server.use(
      http.post(apiUrl('/auth/register'), () =>
        HttpResponse.json(errorBody('CONFLICT', message, [{ path: 'email', message }]), {
          status: 409,
        }),
      ),
    );
    const { container } = renderApp('/register');

    expect(
      await screen.findByRole('heading', { name: 'أنشئ حسابك', level: 1 }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('الاسم'), 'سارة أحمد');
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'sara@example.com');
    await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
    expect(screen.getByText('جيدة')).toBeInTheDocument();
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'password123');
    await user.click(screen.getByRole('button', { name: 'إنشاء حساب' }));

    const email = screen.getByLabelText('البريد الإلكتروني');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('يوجد حساب بهذا البريد الإلكتروني بالفعل.');
    });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('a visible error follows a language switch', () => {
  it('re-reads client validation errors in the new language, and back', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));
    const email = screen.getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('Enter your email');
    });

    await user.click(screen.getByRole('button', { name: 'ع — العربية' }));

    await waitFor(() => {
      expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAccessibleDescription(
        'أدخل بريدك الإلكتروني',
      );
    });
    expect(screen.getByLabelText('كلمة المرور')).toHaveAccessibleDescription('أدخل كلمة المرور');
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'EN — English' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email');
    });
  });

  it('re-reads a server error under a field (register 409) and the typed values stay', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    const user = userEvent.setup();
    const message = 'An account with this email already exists.';
    server.use(
      http.post(apiUrl('/auth/register'), () =>
        HttpResponse.json(errorBody('CONFLICT', message, [{ path: 'email', message }]), {
          status: 409,
        }),
      ),
    );
    renderApp('/register');

    await user.type(await screen.findByLabelText('Name'), 'Sara Ahmed');
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(message);
    });

    await user.click(screen.getByRole('button', { name: 'ع — العربية' }));

    const email = await screen.findByLabelText('البريد الإلكتروني');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('يوجد حساب بهذا البريد الإلكتروني بالفعل.');
    });
    expect(email).toHaveValue('sara@example.com');
    expect(screen.getByLabelText('الاسم')).toHaveValue('Sara Ahmed');
  });
});
