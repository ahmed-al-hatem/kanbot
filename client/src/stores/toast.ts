import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  /** ms before the Toaster hides it; `null` keeps it until dismissed. */
  duration: number | null;
}

/** Without a `duration`, the Flag timing from DESIGN §7 applies: 3.2s, or 5s with an action. */
export type ToastInput = Omit<Toast, 'id' | 'duration'> & { duration?: number | null };

interface ToastState {
  /** One toast at a time (DESIGN §7 Flag): a new one replaces the current one. */
  toast: Toast | null;
  show: (input: ToastInput) => number;
  /** Without an id, dismisses whatever is showing. With one, only if it is still that toast. */
  dismiss: (id?: number) => void;
  reset: () => void;
}

export const DEFAULT_TOAST_DURATION = 3200;
export const ACTION_TOAST_DURATION = 5000;

let nextId = 1;

export const useToast = create<ToastState>()((set, get) => ({
  toast: null,
  show: ({ duration, ...input }) => {
    const id = nextId++;
    // `null` is kept: it means "until dismissed".
    const ms =
      duration === undefined
        ? input.action
          ? ACTION_TOAST_DURATION
          : DEFAULT_TOAST_DURATION
        : duration;
    set({ toast: { ...input, id, duration: ms } });
    return id;
  },
  dismiss: (id) => {
    if (id === undefined || get().toast?.id === id) set({ toast: null });
  },
  reset: () => {
    set({ toast: null });
  },
}));

/** Usable outside React, e.g. from a mutation's `onError`. */
export const toast = {
  show: (input: ToastInput) => useToast.getState().show(input),
  success: (message: string, options?: Partial<ToastInput>) =>
    useToast.getState().show({ ...options, kind: 'success', message }),
  error: (message: string, options?: Partial<ToastInput>) =>
    useToast.getState().show({ ...options, kind: 'error', message }),
  info: (message: string, options?: Partial<ToastInput>) =>
    useToast.getState().show({ ...options, kind: 'info', message }),
  dismiss: (id?: number) => {
    useToast.getState().dismiss(id);
  },
};
