import type { BackendEventMessage } from "@/types/pywebview";

/**
 * Callback invoked with the payload of a backend event.
 */
export type BackendEventHandler = (payload: Record<string, unknown>) => void;

/**
 * Key of the shared pywebview state that carries backend events.
 */
const EVENT_STATE_KEY = "creeky_event";

const handlers = new Map<string, Set<BackendEventHandler>>();
let attached = false;
let lastEventId = 0;

/**
 * Forwards a backend event to the handlers registered for its name.
 *
 * @param message - Event published by the backend.
 */
function dispatch(message: BackendEventMessage | undefined): void {
  if (!message || typeof message.name !== "string" || message.id === lastEventId) return;
  lastEventId = message.id;
  handlers.get(message.name)?.forEach((handler) => handler(message.payload ?? {}));
}

/**
 * Starts listening to the shared pywebview state. The backend never calls
 * into the page; it publishes events on that state and this listener
 * reacts to its change notifications.
 */
export function attachBackendEvents(): void {
  const state = window.pywebview?.state;
  if (attached || !state) return;
  attached = true;
  state.addEventListener("change", (event) => {
    const detail = (event as CustomEvent<{ key: string; value: BackendEventMessage }>).detail;
    if (detail?.key === EVENT_STATE_KEY) dispatch(detail.value);
  });
}

/**
 * Subscribes to a backend event.
 *
 * @param name - Event name, such as `data:changed`.
 * @param handler - Callback invoked with the event payload.
 * @returns Function that removes the subscription.
 */
export function onBackendEvent(name: string, handler: BackendEventHandler): () => void {
  const set = handlers.get(name) ?? new Set<BackendEventHandler>();
  set.add(handler);
  handlers.set(name, set);
  return () => { set.delete(handler); };
}
