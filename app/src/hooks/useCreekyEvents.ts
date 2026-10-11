import { useEffect, useRef } from "react";
import { attachBackendEvents, onBackendEvent } from "@/services/api/events";
import { refreshStore } from "@/services/store";

/**
 * Callbacks invoked for events emitted by the backend.
 */
export interface CreekyEventHandlers {
  /** Called when the reminder scheduler fired task or habit reminders. */
  onReminder?: (counts: { tasks: number; habits: number }) => void;
  /** Called when the user clicks a native notification. */
  onNavigate?: (view: string) => void;
}

/**
 * Subscribes to backend events once the bridge is ready. The backend only
 * publishes events; every reaction lives here in the frontend.
 *
 * @param ready - Whether the pywebview bridge is ready.
 * @param handlers - Callbacks for the supported events.
 */
export function useCreekyEvents(ready: boolean, handlers: CreekyEventHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!ready) return;
    attachBackendEvents();
    const offChanged = onBackendEvent("data:changed", () => { void refreshStore(); });
    const offReminder = onBackendEvent("reminder:fired", (payload) => {
      handlersRef.current.onReminder?.({ tasks: Number(payload.tasks) || 0, habits: Number(payload.habits) || 0 });
    });
    const offClicked = onBackendEvent("notification:clicked", (payload) => {
      handlersRef.current.onNavigate?.(String(payload.view ?? "notifications"));
    });
    return () => {
      offChanged();
      offReminder();
      offClicked();
    };
  }, [ready]);
}
