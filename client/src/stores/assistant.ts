import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { omitKey } from '@/lib/records';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';
import type { ChatMessage } from '@/types/api';

/** One chat bubble. `id` keys the list; the API only sees `role` and `content`. */
export interface ChatEntry extends ChatMessage {
  id: string;
  createdAt: string;
}

/**
 * The AI dialogs the drawer chips, the backlog header and New project open (DESIGN §9 08, 09).
 * Mounted once per project page by `AiDialogsHost`.
 */
export type AiDialogRequest =
  | {
      kind: 'generate';
      projectId: string;
      /** Pre-fills the description (the starter backlog uses the project's description). */
      prompt?: string;
    }
  | { kind: 'plan'; projectId: string };

/** `key` remounts the dialog on every open, so it starts fresh. */
export type AiDialog = AiDialogRequest & { key: number };

interface AssistantState {
  /** The AI drawer (DESIGN §7). */
  open: boolean;
  /**
   * Chat per project (plan §5.2): switching project shows that project's chat, so a new
   * project starts empty. Kept while the drawer is closed, and persisted per project
   * (Requirements §9 "Save chat history per project in localStorage").
   */
  chats: Record<string, ChatEntry[]>;
  /** Text waiting in the composer per project, e.g. from "Improve this todo". Never sent by itself. */
  composer: Record<string, string>;
  dialog: AiDialog | null;
  /**
   * The project the drawer was last opened for with `openWith`. Used only when the URL has no
   * (existing) project, e.g. "Ask AI to find it" on the 404 page; a project in the URL wins.
   */
  target: string | null;
  setOpen: (open: boolean) => void;
  /** Opens the drawer for a project, optionally with a prompt in the composer (not sent). */
  openWith: (projectId: string, prompt?: string) => void;
  append: (projectId: string, message: ChatMessage) => void;
  setComposer: (projectId: string, text: string) => void;
  /** "New chat": the project's conversation and composer start over. */
  newChat: (projectId: string) => void;
  /** Opens an AI dialog and closes the drawer (the canvas swaps one for the other). */
  openDialog: (request: AiDialogRequest) => void;
  closeDialog: () => void;
  reset: () => void;
}

const initialState = { open: false, chats: {}, composer: {}, dialog: null, target: null } satisfies Partial<AssistantState>;

let nextId = 1;
let nextDialogKey = 1;

const entryId = () => `m${Date.now().toString(36)}-${(nextId++).toString(36)}`;

export const useAssistant = create<AssistantState>()(
  persist(
    (set) => ({
      ...initialState,
      setOpen: (open) => {
        set({ open });
      },
      openWith: (projectId, prompt) => {
        set((state) => ({
          open: true,
          target: projectId,
          composer: prompt === undefined ? state.composer : { ...state.composer, [projectId]: prompt },
        }));
      },
      append: (projectId, message) => {
        const entry: ChatEntry = { ...message, id: entryId(), createdAt: new Date().toISOString() };
        set((state) => ({ chats: { ...state.chats, [projectId]: [...(state.chats[projectId] ?? []), entry] } }));
      },
      setComposer: (projectId, text) => {
        set((state) => ({ composer: { ...state.composer, [projectId]: text } }));
      },
      newChat: (projectId) => {
        set((state) => ({ chats: omitKey(state.chats, projectId), composer: omitKey(state.composer, projectId) }));
      },
      openDialog: (request) => {
        set({ open: false, dialog: { ...request, key: nextDialogKey++ } });
      },
      closeDialog: () => {
        set({ dialog: null });
      },
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEYS.chats,
      storage: createJSONStorage(() => safeStorage),
      // Only the conversations: the drawer, dialogs and composer drafts start closed and empty.
      partialize: (state) => ({ chats: state.chats }),
      version: 1,
    },
  ),
);

export const openAssistant = () => {
  useAssistant.getState().setOpen(true);
};

/** Server limits (ai.routes.ts): 1–30 messages, content ≤ 4000 characters. */
export const CHAT_MAX_MESSAGES = 30;
export const CHAT_MAX_CONTENT = 4000;

/** The last `limit` messages, as the API wants them (ChatRequest: 1–30, content ≤ 4000). */
export function toChatRequest(entries: readonly ChatEntry[], limit = CHAT_MAX_MESSAGES): ChatMessage[] {
  return entries.slice(-limit).map(({ role, content }) => ({ role, content: content.slice(0, CHAT_MAX_CONTENT) }));
}
