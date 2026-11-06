import { useEffect, useState } from 'react';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Field/Input';
import { Select } from '@/components/Field/Select';
import { Icon } from '@/components/Icon/Icon';
import { PRIORITY_OPTIONS, TYPE_OPTIONS, isTodoPriority, isTodoType } from '@/features/todos/todoMeta';
import { useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './Backlog.module.css';
import { isFiltering, type BacklogFilters } from './backlogFilters';

/** DESIGN §5.5 / plan §5.5: the URL (and so the filter) follows the search box 300ms after typing stops. */
const SEARCH_DEBOUNCE_MS = 300;

interface FilterBarProps {
  filters: BacklogFilters;
  onChange: (patch: Partial<BacklogFilters>) => void;
  onClear: () => void;
  shown: number;
  total: number;
}

/**
 * DESIGN §9 04 filter bar (BL-6): search (key, title, description, labels), priority and type.
 * While filters are active: "Showing X of Y" and Clear filters.
 */
export function FilterBar({ filters, onChange, onClear, shown, total }: FilterBarProps) {
  const t = useT();
  const format = useFormat();
  const copy = t.backlog.filters;
  // The box owns what is typed; the URL follows it 300ms later. The box never copies back
  // from the URL: navigations are async, so a debounced write ("fronte") can land after more
  // was typed and would overwrite it. The only other writer is Clear filters, below; filters
  // replace the history entry, so Back never changes `q` under the box.
  const [draft, setDraft] = useState(filters.q);

  const clear = () => {
    setDraft('');
    onClear();
  };

  useEffect(() => {
    if (draft === filters.q) return;
    const timer = setTimeout(() => {
      onChange({ q: draft });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, filters.q, onChange]);

  return (
    <div className={styles.filters} role="search" aria-label={copy.label}>
      <div className={styles.search}>
        <label htmlFor="backlog-search" className="visually-hidden">
          {copy.search}
        </label>
        <Icon name="search" className={styles.searchIcon} />
        <Input
          id="backlog-search"
          type="search"
          data-shortcut="search"
          className={styles.searchInput}
          placeholder={copy.searchPlaceholder}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
      </div>

      <label htmlFor="backlog-priority" className="visually-hidden">
        {copy.byPriority}
      </label>
      <span className={styles.filterSelect}>
        <Select
          id="backlog-priority"
          value={filters.priority ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ priority: isTodoPriority(value) ? value : null });
          }}
        >
          <option value="">{copy.allPriorities}</option>
          {PRIORITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t.todos.priority[value]}
            </option>
          ))}
        </Select>
      </span>

      <label htmlFor="backlog-type" className="visually-hidden">
        {copy.byType}
      </label>
      <span className={styles.filterSelect}>
        <Select
          id="backlog-type"
          value={filters.type ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ type: isTodoType(value) ? value : null });
          }}
        >
          <option value="">{copy.allTypes}</option>
          {TYPE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t.todos.type[value]}
            </option>
          ))}
        </Select>
      </span>

      {isFiltering(filters) && (
        <span className={cx(styles.summary, 'kb-pop')}>
          <span role="status">{copy.showing(format.number(shown), format.number(total))}</span>
          <Button variant="subtle" size="sm" className={styles.clear} onClick={clear}>
            {copy.clear}
          </Button>
        </span>
      )}
    </div>
  );
}
