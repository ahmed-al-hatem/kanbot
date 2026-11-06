import type { ReactNode } from 'react';
import { Button } from '@/components/Button/Button';
import { Checkbox } from '@/components/Field/Checkbox';
import { Icon } from '@/components/Icon/Icon';
import { useAiStatus } from '@/hooks/useAi';
import { useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { useNow } from '@/lib/useNow';
import { aiErrorMessage } from './aiCopy';
import styles from './ai.module.css';

/** DESIGN §7 AI thinking: three 6px `--ai-icon` dots bouncing (`kbDot` 1.2s, 0.2s apart). */
export function ThinkingDots() {
  return (
    <span className={styles.dots} aria-hidden="true">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}

/** AI-5: "Mock AI" when the server runs the built-in rule-based assistant (`GET /ai/status`). */
export function MockBadge() {
  const t = useT();
  const { data } = useAiStatus();
  if (data?.mode !== 'mock') return null;
  return (
    <span className={styles.mockBadge} title={t.ai.mockHint}>
      {t.ai.mockBadge}
    </span>
  );
}

/** AI-5's "AI can make mistakes. Review before saving." unless the surface says it its own way. */
export function AiDisclaimer({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return <p className={cx(styles.disclaimer, className)}>{children ?? t.ai.disclaimer}</p>;
}

interface AiErrorPanelProps {
  title: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
  /** Reassurance under the server's message, e.g. "Your description is kept." */
  hint?: string;
  compact?: boolean;
  className?: string;
}

/**
 * DESIGN §9 08 / S07 AI error: a dashed danger panel with the error's message (502 AI_ERROR,
 * 429 RATE_LIMITED — AI-5) and "Try again". `role="alert"`, so it is announced. The message is
 * read from the error at render, so a panel on screen changes language with the UI.
 */
export function AiErrorPanel({
  title,
  error,
  onRetry,
  retrying = false,
  hint,
  compact = false,
  className,
}: AiErrorPanelProps) {
  const t = useT();
  return (
    <div
      role="alert"
      className={cx(styles.errorPanel, compact && styles.errorCompact, 'kb-pop', className)}
    >
      <Icon name="status-error" size={compact ? 16 : 24} className={styles.errorIcon} />
      <span className={styles.errorTitle}>{title}</span>
      <span className={styles.errorText}>
        {aiErrorMessage(error, t)}
        {hint && <> {hint}</>}
      </span>
      <Button
        variant={compact ? 'neutral' : 'primary'}
        size={compact ? 'sm' : 'md'}
        icon="refresh"
        loading={retrying}
        loadingText={t.ai.tryingAgain}
        onClick={onRetry}
      >
        {t.common.tryAgain}
      </Button>
    </div>
  );
}

interface SummaryOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** DESIGN §9 11: Complete sprint's "Generate AI summary" checkbox, AI-styled (SPR-6, AI-4). */
export function SummaryOption({ checked, onChange }: SummaryOptionProps) {
  const copy = useT().ai.summaryOption;
  return (
    <Checkbox
      className={styles.option}
      checked={checked}
      onChange={(event) => {
        onChange(event.target.checked);
      }}
      label={
        <span className={styles.optionLabel}>
          <Icon name="ai-sparkle" size={12} className={styles.optionIcon} />
          {copy.label}
        </span>
      }
      description={copy.help}
    />
  );
}

/**
 * When an AI text was generated: "Nov 4, 2026, 3:42 PM · 2 min ago" in a `<time>` with the full
 * ISO value, so a Regenerate visibly changes it. The relative part refreshes every minute.
 */
export function GeneratedAt({ iso }: { iso: string }) {
  const t = useT();
  const format = useFormat();
  const now = useNow();
  return (
    <time dateTime={iso} title={iso}>
      {t.ai.generatedAt(format.dateTime(iso), format.timeAgo(iso, now))}
    </time>
  );
}
