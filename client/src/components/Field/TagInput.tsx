import { useRef, useState, type KeyboardEvent } from 'react';
import { Chip } from '@/components/Chip/Chip';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { announce } from '@/stores/announcer';
import { useFieldControl } from './fieldContext';
import styles from './Field.module.css';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  /** The API allows 10 labels of up to 30 characters (server schemas). */
  maxTags?: number;
  maxTagLength?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-describedby'?: string;
}

/**
 * DESIGN §7 Tag input: chips inside a field-looking box with a borderless input.
 * Enter or `,` adds, Backspace on an empty input removes the last chip (DESIGN §10.1).
 * Duplicates (case-insensitive) are ignored; each change is announced (`tags.*` messages: the
 * one tag input today holds labels).
 */
export function TagInput({
  value,
  onChange,
  onBlur,
  maxTags = 10,
  maxTagLength = 30,
  placeholder,
  disabled,
  className,
  ...props
}: TagInputProps) {
  const control = useFieldControl(props);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, maxTagLength);
    setDraft('');
    if (!tag) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      announce(t.tags.alreadyAdded(tag));
      return;
    }
    if (value.length >= maxTags) {
      announce(t.tags.limit(maxTags));
      return;
    }
    onChange([...value, tag]);
    announce(t.tags.added(tag));
  };

  const remove = (tag: string) => {
    onChange(value.filter((existing) => existing !== tag));
    announce(t.tags.removed(tag));
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter must not submit the surrounding form.
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      const last = value[value.length - 1];
      if (last !== undefined) remove(last);
    }
  };

  return (
    <div className={cx(styles.tagInput, disabled && styles.disabled, className)}>
      {value.map((tag) =>
        disabled ? (
          <Chip key={tag} tone="gray">
            {tag}
          </Chip>
        ) : (
          <Chip
            key={tag}
            tone="gray"
            className="kb-pop"
            onRemove={() => {
              remove(tag);
            }}
            removeLabel={t.tags.remove(tag)}
          >
            {tag}
          </Chip>
        ),
      )}
      <input
        ref={inputRef}
        type="text"
        className={styles.tagInputField}
        value={draft}
        maxLength={maxTagLength}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // A typed-but-not-entered tag is kept rather than silently dropped.
          if (draft.trim()) add(draft);
          onBlur?.();
        }}
        {...control}
      />
    </div>
  );
}
