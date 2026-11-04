import { lazy, Suspense, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { plural } from '@/lib/format';
import { useAssistant, type AiDialog } from '@/stores/assistant';
import { toast } from '@/stores/toast';
import type { Sprint, Todo } from '@/types/api';

// Both dialogs load on first use, not with the page (plan §5.4).
const GenerateTodosDialog = lazy(async () => {
  const { GenerateTodosDialog: Component } = await import('./GenerateTodosDialog');
  return { default: Component };
});
const PlanSprintDialog = lazy(async () => {
  const { PlanSprintDialog: Component } = await import('./PlanSprintDialog');
  return { default: Component };
});

/** The page title, for when the element that opened the dialog is gone (a drawer chip). */
const pageTitle = () => document.querySelector<HTMLElement>('.page-title');

/**
 * Mounts the AI dialog the store asks for (Generate todos, Plan sprint), whoever opened it: the
 * backlog header, the empty backlog, a drawer chip, or New project's starter backlog. The last
 * one stays mounted while it animates out. Both save to the backlog, so off the backlog page the
 * success toast links to it.
 */
export function AiDialogsHost({ projectId }: { projectId: string }) {
  const dialog = useAssistant((s) => s.dialog);
  const closeDialog = useAssistant((s) => s.closeDialog);
  const openDialog = useAssistant((s) => s.openDialog);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [shown, setShown] = useState<AiDialog | null>(dialog);
  // Adjusting state while rendering (not in an effect): a new dialog replaces the last one at once.
  if (dialog && dialog !== shown) setShown(dialog);

  if (shown?.projectId !== projectId) return null;
  const open = dialog?.key === shown.key;
  const backlogPath = `/projects/${projectId}/backlog`;
  const onBacklog = pathname.startsWith(backlogPath);
  const viewBacklog = onBacklog
    ? undefined
    : {
        label: 'View backlog',
        onClick: () => {
          void navigate(backlogPath);
        },
      };
  const onOpenChange = (next: boolean) => {
    if (!next) closeDialog();
  };

  const onAdded = (todos: Todo[]) => {
    closeDialog();
    toast.success(`${plural(todos.length, 'todo')} added to the backlog`, { action: viewBacklog });
  };
  const onCreated = (sprint: Sprint, count: number) => {
    closeDialog();
    toast.success(`${sprint.name} created with ${plural(count, 'todo')}`, { action: viewBacklog });
  };

  return (
    <Suspense fallback={null}>
      {shown.kind === 'generate' ? (
        <GenerateTodosDialog
          key={shown.key}
          open={open}
          onOpenChange={onOpenChange}
          projectId={projectId}
          initialPrompt={shown.prompt}
          onAdded={onAdded}
          fallbackFocus={pageTitle}
        />
      ) : (
        <PlanSprintDialog
          key={shown.key}
          open={open}
          onOpenChange={onOpenChange}
          projectId={projectId}
          onCreated={onCreated}
          onGenerate={() => {
            openDialog({ kind: 'generate', projectId });
          }}
          fallbackFocus={pageTitle}
        />
      )}
    </Suspense>
  );
}
