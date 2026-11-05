import { Fragment } from 'react';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { useShortcuts } from '@/stores/shortcuts';
import { SHORTCUTS } from './shortcuts';
import styles from './Shortcuts.module.css';

/** `?` (or the profile menu): every global shortcut, then the keys of cards and rows. */
export function ShortcutsDialog() {
  const open = useShortcuts((s) => s.helpOpen);
  const setOpen = useShortcuts((s) => s.setHelpOpen);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Keyboard shortcuts"
      description="They work anywhere in the app, except while you're typing in a field."
      size="complete"
      footer={
        <Button
          variant="primary"
          data-autofocus
          onClick={() => {
            setOpen(false);
          }}
        >
          Close
        </Button>
      }
    >
      <dl className={styles.list}>
        {SHORTCUTS.map(({ keys, label }) => (
          <div key={keys.join(' ')} className={styles.row}>
            <dt className={styles.keys}>
              {keys.map((key, index) => (
                <Fragment key={key}>
                  {index > 0 && <span className={styles.then}>then</span>}
                  <kbd className={styles.kbd}>{key}</kbd>
                </Fragment>
              ))}
            </dt>
            <dd className={styles.label}>{label}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        On the board and the backlog, focus a card or a row and use the arrow keys to move it; Enter opens it.
      </p>
    </Dialog>
  );
}
