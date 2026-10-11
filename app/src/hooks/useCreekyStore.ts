import { useSyncExternalStore } from "react";
import { getStore, refreshStore, subscribeStore } from "@/services/store";
import type { CreekyDB } from "@/types/creeky";

/**
 * Hook exposing the application state served by the backend.
 *
 * @returns The current snapshot and a function that reloads it.
 */
export function useCreekyStore(): { store: CreekyDB; refresh: () => Promise<void> } {
  const store = useSyncExternalStore(subscribeStore, getStore);
  return { store, refresh: refreshStore };
}
