import styles from './AppShell.module.css';

/** DESIGN §6 / §10.1: the first Tab stop, hidden above the viewport until focused. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className={styles.skip}
      onClick={(event) => {
        // The router would treat the hash as navigation; just move focus.
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}
    >
      Skip to main content
    </a>
  );
}
