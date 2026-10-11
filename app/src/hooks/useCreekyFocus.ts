import { useCallback } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage } from "@/i18n";
import { settingsApi } from "@/services/api/system.api";
import type { FocusPayload } from "@/types/creeky";

export type { FocusPayload };

/**
 * Hook for the task focused in the Pomodoro view, persisted by the backend.
 *
 * @returns The focused task with functions to change and clear it.
 */
export function useCreekyFocus(): {
  focus: FocusPayload | null;
  setFocus: (payload: FocusPayload | null) => void;
  clear: () => void;
  focusId: string | null;
} {
  const { store } = useCreekyStore();
  const focus = store.focus;

  const setFocus = useCallback((payload: FocusPayload | null) => {
    void settingsApi.setFocus(payload).catch((error: unknown) => pushToast(errorMessage(error), "error"));
  }, []);

  const clear = useCallback(() => setFocus(null), [setFocus]);

  return { focus, setFocus, clear, focusId: focus?.id || null };
}
