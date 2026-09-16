import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "info" | "success" | "warning" | "error";
export interface ToastItem { id: string; message: string; type: ToastType; }

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) { window.clearTimeout(tm); timers.current.delete(id); }
  }, []);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast_${++_id}_${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const tm = window.setTimeout(() => dismiss(id), 3200);
    timers.current.set(id, tm);
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((tm) => window.clearTimeout(tm));
    timers.current.clear();
  }, []);

  return { toasts, push, dismiss };
}
