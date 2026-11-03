import { Icon } from '@/components/Icon/Icon';
import { Logo } from '@/components/Logo/Logo';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { useTheme } from '@/stores/theme';
import styles from './FoundationsPage.module.css';

/** Phase 0 placeholder: proves tokens, fonts, icons and the theme store work. Replaced in phase 2. */
export function FoundationsPage() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);

  return (
    <main className={`${styles.page ?? ''} kb-page`}>
      <Logo size={36} wordmark />
      <h1 className="page-title">Foundations ready</h1>
      <p className={styles.subtle}>Screens arrive phase by phase.</p>
      <div className={styles.row}>
        <TypeIcon type="task" />
        <TypeIcon type="story" />
        <TypeIcon type="bug" />
        <Icon name="ai-sparkle" className={styles.ai} label="AI" />
      </div>
      <button type="button" className={styles.toggle} onClick={toggle}>
        <Icon name="theme" />
        {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      </button>
    </main>
  );
}
