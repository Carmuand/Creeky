import { applyLanguage } from "@/i18n";
import { dataApi } from "@/services/api/system.api";
import { onMutation } from "@/services/api/bridge";
import type { CreekyDB } from "@/types/creeky";

/**
 * State used before the first snapshot arrives from the backend.
 */
const EMPTY_STORE: CreekyDB = {
  user: null,
  tags: [],
  tasks: [],
  lists: [],
  habits: [],
  matrix: { q1: [], q2: [], q3: [], q4: [] },
  countdowns: [],
  pomoLog: [],
  notifications: [],
  emailLinks: [],
  focus: null,
  unad: { connected: false, account: null, profile: null, agendas: [] },
  notificationPrefs: { desktop: true, tasks: true, habits: true, pomodoro: true, unad_changes: true, unad_opening: true, unad_deadline: true },
  settings: { theme: "light", language: "es", sidebarCollapsed: true },
};

let snapshot: CreekyDB = EMPTY_STORE;
let hydrated = false;
let pending: Promise<void> | null = null;
let queued = false;
const listeners = new Set<() => void>();

/**
 * Subscribes to store changes.
 *
 * @param listener - Callback invoked after the snapshot changes.
 * @returns Function that removes the subscription.
 */
export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Returns the latest snapshot served by the backend.
 *
 * @returns Current application state.
 */
export function getStore(): CreekyDB {
  return snapshot;
}

/**
 * Tells whether the first snapshot was already loaded.
 *
 * @returns True once the store holds backend data.
 */
export function isStoreHydrated(): boolean {
  return hydrated;
}

/**
 * Loads one snapshot from the backend and notifies subscribers.
 *
 * @returns Promise resolved once the store holds the new snapshot.
 */
async function load(): Promise<void> {
  const next = await dataApi.getSnapshot();
  snapshot = next;
  hydrated = true;
  applyLanguage(next.settings.language);
  listeners.forEach((listener) => listener());
}

/**
 * Reloads the snapshot from the backend. A call made while a request is
 * in flight triggers one more reload afterwards, so the store never ends
 * on data older than the latest change.
 *
 * @returns Promise resolved once the store reflects the latest state.
 */
export function refreshStore(): Promise<void> {
  if (pending) {
    queued = true;
    return pending;
  }
  pending = (async () => {
    try {
      do {
        queued = false;
        await load();
      } while (queued);
    } finally {
      pending = null;
    }
  })();
  return pending;
}

onMutation(refreshStore);
