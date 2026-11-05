import * as RadixDialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMatch } from 'react-router';
import { Button, IconButton } from '@/components/Button/Button';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { useReturnFocus } from '@/components/Dialog/useReturnFocus';
import { Icon } from '@/components/Icon/Icon';
import { useChat, useSummarizeSprint } from '@/hooks/useAi';
import { useProject } from '@/hooks/useProjects';
import { omitKey } from '@/lib/records';
import { useSprints } from '@/hooks/useSprints';
import { announce } from '@/stores/announcer';
import { useNotFound } from '@/stores/notFound';
import { CHAT_MAX_CONTENT, toChatRequest, useAssistant, type ChatEntry } from '@/stores/assistant';
import { toast } from '@/stores/toast';
import type { ChatMessage, Sprint } from '@/types/api';
import { AI_DISCLAIMER } from './aiCopy';
import { AiDisclaimer, AiErrorPanel, MockBadge, ThinkingDots } from './AiParts';
import { stripInternalIds } from './aiText';
import { LazyMarkdown } from './LazyMarkdown';
import styles from './AssistantDrawer.module.css';

type SprintRef = Pick<Sprint, 'id' | 'name' | 'projectId'>;

/** What the drawer asked the server for, kept so "Try again" sends exactly the same thing. */
type AiRequest =
  | { kind: 'chat'; projectId: string; messages: ChatMessage[] }
  | { kind: 'summary'; projectId: string; sprint: SprintRef };

interface Failure {
  request: AiRequest;
  error: unknown;
}

/** Page-aware example prompts (Requirements §9 "Suggested prompts … backlog vs board"). */
const EXAMPLES: Record<string, readonly string[]> = {
  backlog: [
    'Which backlog todos should go into the next sprint?',
    'Which todos are missing story points?',
    'Suggest a goal for the next sprint',
  ],
  board: ["What's blocking the active sprint?", 'What should I work on next?', 'Are we on track to finish this sprint?'],
  sprints: ['How did the last sprint go?', 'What should we improve next sprint?', 'Compare our last two sprints'],
};

/**
 * DESIGN §7 AI drawer (AI-1, AI-5): a 440px side dialog with the Mock AI badge, New chat,
 * quick actions (Create todos, Plan sprint, Summarize sprint), page-aware example prompts, the
 * conversation (`role="log"`), thinking dots, inline errors with Try again, and the composer.
 * The chat lives in `stores/assistant.ts` per project: kept while closed, fresh per project.
 * This component stays mounted after the first open (AppShell), so an answer that arrives while
 * the drawer is closed still lands in its chat.
 */
export function AssistantDrawer() {
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  const append = useAssistant((s) => s.append);
  const routeProjectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const notFound = useNotFound((s) => s.cause);
  const target = useAssistant((s) => s.target);
  // The project in the URL. On the 404 page without a usable one (unknown route, missing
  // project), the project "Ask AI to find it" chose.
  const projectId =
    notFound === 'project' || (notFound && !routeProjectId) ? (target ?? undefined) : routeProjectId;
  const section = useMatch('/projects/:projectId/:section/*')?.params.section ?? 'backlog';
  const returnFocus = useReturnFocus();
  const chat = useChat();
  const summarize = useSummarizeSprint();
  // Per project: switching project mid-answer keeps each chat's own state.
  const [failures, setFailures] = useState<Record<string, Failure>>({});
  const [pending, setPending] = useState<Record<string, AiRequest>>({});
  // Bumped by New chat, so an answer to the old conversation doesn't land in the new one.
  const generation = useRef<Record<string, number>>({});

  // Outside a project (e.g. Back to /projects) there is no chat to show.
  useEffect(() => {
    if (!projectId && useAssistant.getState().open) setOpen(false);
  }, [projectId, setOpen]);

  const setFor = <T,>(set: (fn: (state: Record<string, T>) => Record<string, T>) => void, id: string, value: T | null) => {
    set((state) => (value === null ? omitKey(state, id) : { ...state, [id]: value }));
  };

  const run = (request: AiRequest) => {
    const id = request.projectId;
    const gen = generation.current[id] ?? 0;
    const current = () => (generation.current[id] ?? 0) === gen;
    setFor(setFailures, id, null);
    setFor(setPending, id, request);
    // `mutateAsync`, not `mutate` callbacks: those only fire for the latest call, and two
    // projects can each be waiting for an answer.
    const answer =
      request.kind === 'chat'
        ? chat.mutateAsync({ projectId: id, messages: request.messages }).then((response) => response.message.content)
        : summarize.mutateAsync({ sprint: request.sprint }).then((response) => response.summary.content);
    answer.then(
      (content) => {
        setPending((state) => (state[id] === request ? omitKey(state, id) : state));
        if (!current()) return;
        append(id, { role: 'assistant', content });
        announce('Kanbot answered');
      },
      (error: unknown) => {
        setPending((state) => (state[id] === request ? omitKey(state, id) : state));
        if (current()) setFor(setFailures, id, { request, error });
      },
    );
  };

  const send = (projectIdToUse: string, text: string) => {
    const content = text.trim().slice(0, CHAT_MAX_CONTENT);
    if (!content) return;
    append(projectIdToUse, { role: 'user', content });
    useAssistant.getState().setComposer(projectIdToUse, '');
    // The whole conversation, trimmed to the API's last 30 messages (it ends with this one).
    const entries = useAssistant.getState().chats[projectIdToUse] ?? [];
    run({ kind: 'chat', projectId: projectIdToUse, messages: toChatRequest(entries) });
  };

  const summarizeSprint = (projectIdToUse: string, sprint: SprintRef) => {
    append(projectIdToUse, { role: 'user', content: `Summarize ${sprint.name}` });
    run({ kind: 'summary', projectId: projectIdToUse, sprint });
  };

  const newChat = (projectIdToUse: string) => {
    generation.current[projectIdToUse] = (generation.current[projectIdToUse] ?? 0) + 1;
    useAssistant.getState().newChat(projectIdToUse);
    setFor(setFailures, projectIdToUse, null);
    setFor(setPending, projectIdToUse, null);
    announce('New chat started');
  };

  return (
    <RadixDialog.Root open={open && Boolean(projectId)} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.blanket} />
        <RadixDialog.Content
          className={styles.drawer}
          aria-modal="true"
          onOpenAutoFocus={(event) => {
            returnFocus.capture();
            event.preventDefault();
            focusComposer();
          }}
          onCloseAutoFocus={(event) => {
            // Closed because a chip opened an AI dialog: focus belongs to that dialog now.
            if (useAssistant.getState().dialog) {
              event.preventDefault();
              return;
            }
            returnFocus.restore(event);
          }}
        >
          {projectId && (
            <DrawerBody
              projectId={projectId}
              section={section}
              busy={Boolean(pending[projectId])}
              failure={failures[projectId] ?? null}
              onSend={(text) => {
                send(projectId, text);
              }}
              onSummarize={(sprint) => {
                summarizeSprint(projectId, sprint);
              }}
              onRetry={() => {
                const failure = failures[projectId];
                if (failure) run(failure.request);
              }}
              onNewChat={() => {
                newChat(projectId);
              }}
            />
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

const COMPOSER_ID = 'kanbot-composer';

function focusComposer() {
  const composer = document.getElementById(COMPOSER_ID);
  if (!(composer instanceof HTMLTextAreaElement)) return;
  composer.focus();
  // A pre-filled prompt ("Improve this todo") is ready to edit from its end.
  composer.setSelectionRange(composer.value.length, composer.value.length);
}

interface DrawerBodyProps {
  projectId: string;
  section: string;
  busy: boolean;
  failure: Failure | null;
  onSend: (text: string) => void;
  onSummarize: (sprint: SprintRef) => void;
  onRetry: () => void;
  onNewChat: () => void;
}

const EMPTY: ChatEntry[] = [];

function DrawerBody({ projectId, section, busy, failure, onSend, onSummarize, onRetry, onNewChat }: DrawerBodyProps) {
  const messages = useAssistant((s) => s.chats[projectId] ?? EMPTY);
  const text = useAssistant((s) => s.composer[projectId] ?? '');
  const setComposer = useAssistant((s) => s.setComposer);
  const openDialog = useAssistant((s) => s.openDialog);
  const setOpen = useAssistant((s) => s.setOpen);
  // A todo key in an answer opens Todo details, which sits under the drawer: close it first.
  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, [setOpen]);
  const project = useProject(projectId);
  const sprints = useSprints(projectId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Summarize sprint: the active sprint, else the most recently completed one (planned → 409).
  const active = project.data?.stats.activeSprint;
  const lastCompleted = sprints.data?.find((sprint) => sprint.status === 'completed');
  const target: SprintRef | undefined = active
    ? { id: active.id, name: active.name, projectId }
    : lastCompleted && { id: lastCompleted.id, name: lastCompleted.name, projectId };
  const examples = EXAMPLES[section] ?? EXAMPLES.backlog ?? [];
  const canSend = text.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter is a new line (AI-1); never while an IME is composing.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  const copy = async (entry: ChatEntry) => {
    try {
      // What the user sees, not the Markdown source (no ** or ##); the raw text as a fallback.
      const bubble = document.querySelector<HTMLElement>(`[data-message-id="${entry.id}"]`);
      let shown = '';
      // innerText keeps the line breaks of lists and headings; jsdom has only textContent.
      if (bubble) shown = bubble.innerText ? bubble.innerText : bubble.textContent;
      await navigator.clipboard.writeText(shown.trim() || stripInternalIds(entry.content));
      setCopiedId(entry.id);
      announce('Copied');
      window.setTimeout(() => {
        setCopiedId((id) => (id === entry.id ? null : id));
      }, 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  };

  return (
    <>
      <header className={styles.header}>
        <Icon name="ai-sparkle" className={styles.sparkle} />
        <div className={styles.heading}>
          <span className={styles.titleRow}>
            <RadixDialog.Title className={styles.title}>Kanbot Assistant</RadixDialog.Title>
            <MockBadge />
          </span>
          <RadixDialog.Description className={styles.subtitle}>AI can make mistakes</RadixDialog.Description>
        </div>
        <Button variant="subtle" size="sm" onClick={onNewChat} disabled={messages.length === 0 && !failure}>
          New chat
        </Button>
        <RadixDialog.Close asChild>
          <IconButton icon="cross" aria-label="Close assistant" />
        </RadixDialog.Close>
      </header>

      <div className={styles.quick} role="group" aria-label="Quick actions">
        <ChipButton
          onClick={() => {
            openDialog({ kind: 'generate', projectId });
          }}
        >
          Create todos
        </ChipButton>
        <ChipButton
          onClick={() => {
            openDialog({ kind: 'plan', projectId });
          }}
        >
          Plan sprint
        </ChipButton>
        <ChipButton
          disabled={busy || !target}
          title={target ? undefined : 'Start a sprint first: there is nothing to summarize yet.'}
          onClick={() => {
            if (target) onSummarize(target);
          }}
        >
          Summarize sprint
        </ChipButton>
      </div>

      <div className={styles.scroller}>
        <div role="log" aria-live="polite" aria-label="Conversation" className={styles.log}>
          {messages.length === 0 && !busy && (
            <div className={styles.empty}>
              <span className={styles.emptyArt} aria-hidden="true">
                <Icon name="ai-sparkle" size={24} />
              </span>
              <h3 className={styles.emptyTitle}>How can I help with your sprint?</h3>
              <p className={styles.emptyText}>Ask about this project, or try one of these:</p>
              <div className={styles.examples}>
                {examples.map((example) => (
                  <ChipButton
                    key={example}
                    onClick={() => {
                      onSend(example);
                    }}
                  >
                    {example}
                  </ChipButton>
                ))}
              </div>
            </div>
          )}

          {messages.map((entry) =>
            entry.role === 'user' ? (
              <div key={entry.id} className={styles.userRow}>
                <span className="visually-hidden">You said:</span>
                <p className={styles.userBubble}>{entry.content}</p>
              </div>
            ) : (
              <div key={entry.id} className={styles.aiRow}>
                <span className={styles.avatar} aria-hidden="true">
                  <Icon name="ai-sparkle" size={12} />
                </span>
                <div className={styles.aiBody}>
                  <span className="visually-hidden">Kanbot said:</span>
                  <div className={styles.aiBubble} data-message-id={entry.id}>
                    <LazyMarkdown projectId={projectId} onOpenTodo={closeDrawer}>
                      {entry.content}
                    </LazyMarkdown>
                  </div>
                  <Button
                    variant="subtle"
                    size="sm"
                    icon={copiedId === entry.id ? 'check-mark' : 'copy'}
                    className={styles.copy}
                    onClick={() => {
                      void copy(entry);
                    }}
                  >
                    {copiedId === entry.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className={styles.aiRow}>
              <span className={styles.avatar} aria-hidden="true">
                <Icon name="ai-sparkle" size={12} />
              </span>
              <span role="status" className={styles.thinking}>
                Thinking
                <ThinkingDots />
              </span>
            </div>
          )}

          {failure && (
            <AiErrorPanel
              compact
              title="Kanbot couldn't answer"
              error={failure.error}
              onRetry={onRetry}
              hint="Your message is kept."
            />
          )}
        </div>
      </div>

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className={styles.composerRow}>
          <label htmlFor={COMPOSER_ID} className="visually-hidden">
            Message Kanbot
          </label>
          <textarea
            id={COMPOSER_ID}
            className={styles.input}
            rows={2}
            maxLength={CHAT_MAX_CONTENT}
            placeholder="Ask Kanbot…"
            aria-describedby={`${COMPOSER_ID}-help`}
            value={text}
            onChange={(event) => {
              setComposer(projectId, event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <Button type="submit" variant="primary" icon="send" disabled={!canSend} className={styles.send}>
            Send
          </Button>
        </div>
        <span id={`${COMPOSER_ID}-help`} className="visually-hidden">
          Enter sends, Shift+Enter adds a new line.
        </span>
        <AiDisclaimer className={styles.disclaimer}>{AI_DISCLAIMER}</AiDisclaimer>
      </form>
    </>
  );
}
