import * as RadixDialog from '@radix-ui/react-dialog';
import { IconButton } from '@/components/Button/Button';
import { useReturnFocus } from '@/components/Dialog/useReturnFocus';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Icon } from '@/components/Icon/Icon';
import { useAssistant } from '@/stores/assistant';
import styles from './AssistantDrawer.module.css';

/**
 * DESIGN §7 AI drawer — the shell only: a 440px side dialog (full width on mobile) titled
 * "Kanbot Assistant", over a blanket, with focus trap, Esc and focus restore. Quick prompts,
 * the chat log and the composer arrive in phase 7.
 */
export function AssistantDrawer() {
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  const returnFocus = useReturnFocus();

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.blanket} />
        <RadixDialog.Content
          className={styles.drawer}
          aria-modal="true"
          onOpenAutoFocus={returnFocus.capture}
          onCloseAutoFocus={returnFocus.restore}
        >
          <header className={styles.header}>
            <Icon name="ai-sparkle" className={styles.sparkle} />
            <div className={styles.heading}>
              <RadixDialog.Title className={styles.title}>Kanbot Assistant</RadixDialog.Title>
              <RadixDialog.Description className={styles.subtitle}>AI can make mistakes</RadixDialog.Description>
            </div>
            <RadixDialog.Close asChild>
              <IconButton icon="cross" aria-label="Close assistant" />
            </RadixDialog.Close>
          </header>
          <div className={styles.body}>
            <EmptyState
              icon="ai-sparkle"
              title="Chat with Kanbot is coming soon"
              description="You'll be able to ask about this project, draft todos and plan the next sprint right here."
              headingLevel={3}
            />
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
