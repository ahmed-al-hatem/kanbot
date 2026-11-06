import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { useLogin } from '@/hooks/useAuth';
import { useT, type Messages } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import { applyLocalizedServerErrors, onInvalidSubmit, useLocalizedErrors } from '@/lib/formErrors';
import { useSession } from '@/stores/session';
import { AuthHeading, AuthLayout } from './AuthLayout';
import { withRedirect } from './redirect';
import { loginSchema } from './schemas';
import styles from './AuthLayout.module.css';

const BANNER_ID = 'login-error';

/** 401: wrong credentials, so the password field is marked invalid too (DESIGN §9 01). */
function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

/** The banner's text, read at render so it follows a language switch. */
function bannerMessage(error: unknown, t: Messages): string {
  return isUnauthorized(error) ? t.auth.login.invalidCredentials : errorMessage(error, t);
}

/** `/login` (AUTH-2). Success lands on `?redirect=` through the guest guard. */
export function LoginPage() {
  const t = useT();
  const [search] = useSearchParams();
  const sessionExpired = useSession((s) => s.sessionExpired);
  const login = useLogin();
  /** The failed request behind the banner (null: no banner). */
  const [formError, setFormError] = useState<unknown>(null);
  const schema = useMemo(() => loginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const setServerError = useLocalizedErrors({ errors, setError, trigger });

  // The banner goes away as soon as either field is edited (DESIGN §9 01).
  const clearBanner = () => {
    setFormError(null);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onError: (error) => {
        if (applyLocalizedServerErrors(error, setServerError, ['email', 'password'])) return;
        setFormError(error);
        if (isUnauthorized(error)) setFocus('password');
      },
    });
  }, onInvalidSubmit);

  const unauthorized = formError !== null && isUnauthorized(formError);

  return (
    <AuthLayout title={t.auth.login.pageTitle}>
      <AuthHeading title={t.auth.login.title} subtitle={t.auth.login.subtitle} />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {formError !== null ? (
          <div id={BANNER_ID}>
            <Banner tone="danger" layout="inline">
              {bannerMessage(formError, t)}
            </Banner>
          </div>
        ) : (
          sessionExpired && (
            <Banner tone="warning" layout="inline">
              {t.auth.login.sessionExpired}
            </Banner>
          )
        )}

        <Field label={t.auth.email} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            {...register('email', { onChange: clearBanner })}
          />
        </Field>

        <div className={styles.passwordField}>
          <Field label={t.auth.password} error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              aria-invalid={unauthorized || undefined}
              aria-describedby={unauthorized ? BANNER_ID : undefined}
              {...register('password', { onChange: clearBanner })}
            />
          </Field>
          <Link to={withRedirect('/forgot-password', search)} className={styles.forgotLink}>
            {t.auth.login.forgot}
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submit}
          loading={login.isPending}
          loadingText={t.auth.login.submitting}
        >
          {t.auth.login.submit}
        </Button>
      </form>

      <p className={styles.switch}>
        {t.auth.login.noAccount} <Link to={withRedirect('/register', search)}>{t.auth.login.createOne}</Link>
      </p>
    </AuthLayout>
  );
}
