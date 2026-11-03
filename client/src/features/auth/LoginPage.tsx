import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { useLogin } from '@/hooks/useAuth';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { useSession } from '@/stores/session';
import { AuthHeading, AuthLayout } from './AuthLayout';
import { withRedirect } from './redirect';
import { loginSchema } from './schemas';
import styles from './AuthLayout.module.css';

const BANNER_ID = 'login-error';
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

interface FormError {
  /** 401: wrong credentials, so the password field is marked invalid too (DESIGN §9 01). */
  unauthorized: boolean;
  message: string;
}

function toFormError(error: unknown): FormError {
  if (!isApiError(error)) return { unauthorized: false, message: 'Something went wrong. Please try again.' };
  return { unauthorized: error.status === 401, message: error.message };
}

/** `/login` (AUTH-2). Success lands on `?redirect=` through the guest guard. */
export function LoginPage() {
  const [search] = useSearchParams();
  const sessionExpired = useSession((s) => s.sessionExpired);
  const login = useLogin();
  const [formError, setFormError] = useState<FormError | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // The banner goes away as soon as either field is edited (DESIGN §9 01).
  const clearBanner = () => {
    setFormError(null);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onError: (error) => {
        if (applyServerErrors(error, setError, ['email', 'password'])) return;
        const next = toFormError(error);
        setFormError(next);
        if (next.unauthorized) setFocus('password');
      },
    });
  }, onInvalidSubmit);

  const unauthorized = formError?.unauthorized ?? false;

  return (
    <AuthLayout title="Log in">
      <AuthHeading title="Welcome back" subtitle="Log in to your sprint board" />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {formError ? (
          <div id={BANNER_ID}>
            <Banner tone="danger" layout="inline">
              {formError.message}
            </Banner>
          </div>
        ) : (
          sessionExpired && (
            <Banner tone="warning" layout="inline">
              {SESSION_EXPIRED_MESSAGE}
            </Banner>
          )
        )}

        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email', { onChange: clearBanner })}
          />
        </Field>

        <div className={styles.passwordField}>
          <Field label="Password" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              aria-invalid={unauthorized || undefined}
              aria-describedby={unauthorized ? BANNER_ID : undefined}
              {...register('password', { onChange: clearBanner })}
            />
          </Field>
          <Link to={withRedirect('/forgot-password', search)} className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submit}
          loading={login.isPending}
          loadingText="Logging in…"
        >
          Log in
        </Button>
      </form>

      <p className={styles.switch}>
        No account? <Link to={withRedirect('/register', search)}>Create one</Link>
      </p>
    </AuthLayout>
  );
}
