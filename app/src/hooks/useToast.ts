import { useSyncExternalStore } from "react";

/**
 * Visual variant of a toast.
 */
export type ToastType = "info" | "success" | "warning" | "error";

/**
 * Toast shown in the bottom-right corner.
 */
export interface ToastItem {
  /** Stable identifier. */
  id: string;
  /** Text shown to the user. */
  message: string;
  /** Visual variant. */
  type: ToastType;
}

/**
 * Function that shows a toast.
 */
export type ToastFn = (message: string, type?: ToastType) => void;

/**
 * Time a toast stays visible, in milliseconds.
 */
const TOAST_DURATION_MS = 3200;

let toasts: ToastItem[] = [];
let sequence = 0;
const timers = new Map<string, number>();
const listeners = new Set<() => void>();

/**
 * Replaces the toast list and notifies subscribers.
 *
 * @param next - New toast list.
 */
function commit(next: ToastItem[]): void {
  toasts = next;
  listeners.forEach((listener) => listener());
}

/**
 * Subscribes to toast list changes.
 *
 * @param listener - Callback invoked after the list changes.
 * @returns Function that removes the subscription.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Removes a toast before its timeout.
 *
 * @param id - Toast identifier.
 */
export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  commit(toasts.filter((toast) => toast.id !== id));
}

/**
 * Shows a toast from anywhere in the application.
 *
 * @param message - Text shown to the user.
 * @param type - Visual variant.
 */
export function pushToast(message: string, type: ToastType = "info"): void {
  const id = `toast_${++sequence}_${Date.now()}`;
  commit([...toasts, { id, message, type }]);
  timers.set(id, window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS));
}

/**
 * Hook exposing the shared toast list.
 *
 * @returns The visible toasts with functions to add and dismiss them.
 */
export function useToast(): { toasts: ToastItem[]; push: ToastFn; dismiss: (id: string) => void } {
  const list = useSyncExternalStore(subscribe, () => toasts);
  return { toasts: list, push: pushToast, dismiss: dismissToast };
}
