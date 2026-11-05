import { Button, IconButton } from '@/components/Button/Button';
import { openAssistant, useAssistant } from '@/stores/assistant';
import styles from './AskAiButton.module.css';

interface AskAiButtonProps {
  /** `icon` in the 56px mobile bar (DESIGN §13), the labelled button in page headers. */
  compact?: boolean;
}

/**
 * Opens the AI drawer (DESIGN §6: "Ask AI" in the page header actions). The header button is
 * hidden on mobile, where the top bar's compact one takes over.
 */
export function AskAiButton({ compact = false }: AskAiButtonProps) {
  const open = useAssistant((s) => s.open);
  const common = { 'aria-haspopup': 'dialog', 'aria-expanded': open, onClick: openAssistant } as const;

  if (compact) return <IconButton variant="ai" icon="ai-sparkle" aria-label="Ask AI" {...common} />;
  return (
    <Button variant="ai" className={styles.headerButton} {...common}>
      Ask AI
    </Button>
  );
}
