import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { useRegister } from '@/hooks/useAuth';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { announce } from '@/stores/announcer';
import { AuthHeading, AuthLayout } from './AuthLayout';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { withRedirect } from './redirect';
import { registerSchema } from './schemas';
import styles from './AuthLayout.module.css';

const STRENGTH_ID = 'register-password-strength';
const EMAIL_TAKEN = 'An account with this email already exists.';

/** `/register` (AUTH-1). Success signs the user in; the guest guard then opens Projects. */
export function RegisterPage() {
  const [search] = useSearchParams();
  const registerUser = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    trigger,
    getFieldState,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(({ name, email, password: pw }) => {
    setFormError(null);
    registerUser.mutate(
      { name, email, password: pw },
      {
        onError: (error) => {
          // AUTH-1: a 409 always goes under Email, even if the server sent no details.
          if (isApiError(error) && error.status === 409) {
            setError('email', { type: 'server', message: error.message || EMAIL_TAKEN }, { shouldFocus: true });
            announce('1 field needs attention');
            return;
          }
          if (applyServerErrors(error, setError, ['name', 'email', 'password'])) return;
          setFormError(isApiError(error) ? error.message : 'Something went wrong. Please try again.');
        },
      },
    );
  }, onInvalidSubmit);

  return (
    <AuthLayout title="Sign up">
      <AuthHeading title="Create your account" subtitle="Plan sprints with an AI teammate" />

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {formError && (
          <Banner tone="danger" layout="inline">
            {formError}
          </Banner>
        )}

        <Field label="Name" error={errors.name?.message}>
          <Input autoComplete="name" placeholder="Your name" {...register('name')} />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          help="At least 8 characters. Numbers and symbols make it stronger."
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

        <Field label="Confirm password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submit}
          loading={registerUser.isPending}
          loadingText="Creating account…"
        >
          Create account
        </Button>
      </form>

      <p className={styles.switch}>
        Already have an account? <Link to={withRedirect('/login', search)}>Log in</Link>
      </p>
    </AuthLayout>
  );
}
