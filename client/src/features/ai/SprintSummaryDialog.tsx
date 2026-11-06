import { Dialog } from '@/components/Dialog/Dialog';
import { useT } from '@/i18n';
import type { Sprint } from '@/types/api';
import { SprintSummaryCard } from './SprintSummaryCard';

interface SprintSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The active sprint, from the board. */
  sprint: Sprint;
}

/**
 * AI-4 on the board: the canvas has an ai "Summarize" button next to Complete sprint, so the
 * summary card opens in a dialog rather than sitting on the page. The card is the Sprints
 * page's: saved summary with its time and Regenerate, or Summarize when there is none yet.
 * A todo key in the summary closes the dialog and opens that todo.
 */
export function SprintSummaryDialog({ open, onOpenChange, sprint }: SprintSummaryDialogProps) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.ai.summary.dialogTitle(sprint.name)}
      size="project"
    >
      <SprintSummaryCard
        sprint={sprint}
        onOpenTodo={() => {
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
