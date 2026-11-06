import { Fragment } from 'react';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { useT } from '@/i18n';
import { useShortcuts } from '@/stores/shortcuts';
import { SHORTCUTS } from './shortcuts';
import styles from './Shortcuts.module.css';

/** `?` (or the profile menu): every global shortcut, then the keys of cards and rows. */
export function ShortcutsDialog() {
  const t = useT();
  const open = useShortcuts((s) => s.helpOpen);
  const setOpen = useShortcuts((s) => s.setHelpOpen);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={t.shell.shortcuts.title}
      description={t.shell.shortcuts.description}
      size="complete"
      footer={
        <Button
          variant="primary"
          data-autofocus
          onClick={() => {
            setOpen(false);
          }}
        >
          {t.common.close}
        </Button>
      }
    >
      <dl className={styles.list}>
        {SHORTCUTS.map(({ keys, describe }) => (
          <div key={keys.join(' ')} className={styles.row}>
            <dt className={styles.keys}>
              {keys.map((key, index) => (
                <Fragment key={key}>
                  {index > 0 && <span className={styles.then}>{t.shell.shortcuts.then}</span>}
                  <kbd className={styles.kbd}>{key}</kbd>
                </Fragment>
              ))}
            </dt>
            <dd className={styles.label}>{describe(t)}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>{t.shell.shortcuts.note}</p>
    </Dialog>
  );
}
