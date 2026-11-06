import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { useRegister } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import {
  announceInvalid,
  applyLocalizedServerErrors,
  onInvalidSubmit,
  useLocalizedErrors,
} from '@/lib/formErrors';
import { AuthHeading, AuthLayout } from './AuthLayout';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { withRedirect } from './redirect';
import { registerSchema } from './schemas';
import styles from './AuthLayout.module.css';

const STRENGTH_ID = 'register-password-strength';

/** `/register` (AUTH-1). Success signs the user in; the guest guard then opens Projects. */
export function RegisterPage() {
  const t = useT();
  const [search] = useSearchParams();
  const registerUser = useRegister();
  /** The failed request behind the banner (null: no banner); its text is read at render. */
  const [formError, setFormError] = useState<unknown>(null);
  const schema = useMemo(() => registerSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    control,
    trigger,
    getFieldState,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });
  const setServerError = useLocalizedErrors({ errors, setError, trigger });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(({ name, email, password: pw }) => {
    setFormError(null);
    registerUser.mutate(
      { name, email, password: pw },
      {
        onError: (error) => {
          // AUTH-1: a 409 always goes under Email, even if the server sent no details.
          if (isApiError(error) && error.status === 409) {
            setServerError('email', (messages) => messages.auth.register.emailTaken, {
              shouldFocus: true,
            });
            announceInvalid(1);
            return;
          }
          if (applyLocalizedServerErrors(error, setServerError, ['name', 'email', 'password']))
            return;
          setFormError(error);
        },
      },
    );
  }, onInvalidSubmit);

  return (
    <AuthLayout title={t.auth.register.pageTitle}>
      <AuthHeading title={t.auth.register.title} subtitle={t.auth.register.subtitle} />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {formError !== null && (
          <Banner tone="danger" layout="inline">
            {errorMessage(formError, t)}
          </Banner>
        )}

        <Field label={t.auth.name} error={errors.name?.message}>
          <Input autoComplete="name" placeholder={t.auth.namePlaceholder} {...register('name')} />
        </Field>

        <Field label={t.auth.email} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            {...register('email')}
          />
        </Field>

        <Field
          label={t.auth.password}
          error={errors.password?.message}
          help={t.auth.register.passwordHelp}
        >
          <Input
            type="password"
            autoComplete="new-password"
            aria-describedby={STRENGTH_ID}
            {...register('password', {
              // Re-check Confirm once it was visited, so "Passwords do not match" clears as they match.
              onChange: () => {
                if (getFieldState('confirm').isTouched) void trigger('confirm');
              },
            })}
          />
          <PasswordStrengthMeter id={STRENGTH_ID} password={password} />
        </Field>

        <Field label={t.auth.confirmPassword} error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submit}
          loading={registerUser.isPending}
          loadingText={t.auth.register.submitting}
        >
          {t.auth.register.submit}
        </Button>
      </form>

      <p className={styles.switch}>
        {t.auth.register.haveAccount}{' '}
        <Link to={withRedirect('/login', search)}>{t.auth.register.logIn}</Link>
      </p>
    </AuthLayout>
  );
}
