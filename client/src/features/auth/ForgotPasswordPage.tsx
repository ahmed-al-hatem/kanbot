import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { Icon } from '@/components/Icon/Icon';
import { getT, useT } from '@/i18n';
import { onInvalidSubmit, useLocalizedErrors } from '@/lib/formErrors';
import { announce } from '@/stores/announcer';
import { AuthHeading, AuthLayout } from './AuthLayout';
import { withRedirect } from './redirect';
import { forgotSchema } from './schemas';
import styles from './AuthLayout.module.css';
import forgot from './ForgotPasswordPage.module.css';

/** Simulated send (plan §10 decision 1). */
const SEND_MS = 800;
const RESEND_COOLDOWN_S = 30;

/** Counts down once per second from `start()`; 0 means ready. */
function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const tick = setTimeout(() => {
      setLeft((s) => s - 1);
    }, 1000);
    return () => {
      clearTimeout(tick);
    };
  }, [left]);
  return {
    left,
    start: () => {
      setLeft(RESEND_COOLDOWN_S);
    },
  };
}

/**
 * `/forgot-password`, **frontend only**: the API has no reset endpoint and password reset is out
 * of scope (plan §2 #5, §10 decision 1). Nothing is sent; the page says so in a "Demo only" note.
 */
export function ForgotPasswordPage() {
  const t = useT();
  const [search] = useSearchParams();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const cooldown = useCooldown();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sentHeading = useRef<HTMLHeadingElement>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  // The form (and the focused button) is replaced by the success state: keep focus in the card.
  useEffect(() => {
    if (sentTo) sentHeading.current?.focus();
  }, [sentTo]);

  const schema = useMemo(() => forgotSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });
  useLocalizedErrors({ errors, setError, trigger });

  const send = (email: string) => {
    setSending(true);
    timer.current = setTimeout(() => {
      setSending(false);
      setSentTo(email);
      cooldown.start();
      announce(getT().auth.forgot.sent);
    }, SEND_MS);
  };

  const backToLogin = (
    <p className={styles.switch}>
      <Link to={withRedirect('/login', search)} className={forgot.back}>
        <Icon name="arrow-left" size={12} />
        {t.auth.forgot.backToLogin}
      </Link>
    </p>
  );

  const demoNote = <p className={forgot.demo}>{t.auth.forgot.demoNote}</p>;

  if (sentTo) {
    const waiting = cooldown.left > 0;
    return (
      <AuthLayout title={t.auth.forgot.checkEmail}>
        <div className={forgot.sent}>
          <span className={forgot.badge}>
            <Icon name="email" size={20} />
          </span>
          <h1 ref={sentHeading} tabIndex={-1} className={styles.title}>
            {t.auth.forgot.checkEmail}
          </h1>
          <p className={forgot.text}>
            {t.auth.forgot.sentBefore}
            <b className={forgot.address}>{sentTo}</b>
            {t.auth.forgot.sentAfter}
          </p>
          <Button
            loading={sending}
            loadingText={t.auth.forgot.sending}
            aria-disabled={sending || waiting || undefined}
            onClick={() => {
              if (!waiting) send(sentTo);
            }}
          >
            {waiting ? t.auth.forgot.resendIn(cooldown.left) : t.auth.forgot.resend}
          </Button>
        </div>
        {backToLogin}
        {demoNote}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.forgot.pageTitle}>
      <AuthHeading title={t.auth.forgot.title} subtitle={t.auth.forgot.subtitle} />

      <form
        className={styles.form}
        noValidate
        // handleSubmit is built here, in the event, because `send` writes a ref (react-hooks/refs).
        onSubmit={(event) => {
          void handleSubmit(({ email }) => {
            send(email);
          }, onInvalidSubmit)(event);
        }}
      >
        <Field label={t.auth.email} error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder={t.auth.emailPlaceholder} {...register('email')} />
        </Field>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submit}
          loading={sending}
          loadingText={t.auth.forgot.sending}
        >
          {t.auth.forgot.submit}
        </Button>
      </form>

      {backToLogin}
      {demoNote}
    </AuthLayout>
  );
}
