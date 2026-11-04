import type { StateStorage } from 'zustand/middleware';

/**
 * localStorage that never throws: access fails in some privacy modes and when the
 * quota is full. Reads fall back to null, writes are dropped.
 */
export const safeStorage: StateStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore: the app keeps working with in-memory state only.
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore, see setItem.
    }
  },
};

/** Keys under which stores persist. `kanbot.theme` is also read by the inline script in index.html. */
export const STORAGE_KEYS = {
  token: 'kanbot.token',
  theme: 'kanbot.theme',
  /** AI chats per project (an enhancement, Requirements §9); cleared on log out. */
  chats: 'kanbot.chats',
} as const;
