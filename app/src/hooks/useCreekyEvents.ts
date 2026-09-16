/**
 * useCreekyEvents — frontend-owned event handlers that Python triggers via evaluate_js.
 * Instead of Python evaluating arbitrary JS, it must call window.__creeky_* with a typed payload.
 */
import { useCallback, useEffect, useState } from "react";

export interface CreekyToastPayload {
  message: string;
  type?: "info" | "success" | "warning" | "error";
}

export function useCreekyEvents(opts?: {
  onToast?: (p: CreekyToastPayload) => void;
  onNavigate?: (view: string) => void;
}) {
  const [lastToast, setLastToast] = useState<CreekyToastPayload | null>(null);

  const handleToast = useCallback((payload: CreekyToastPayload) => {
    setLastToast(payload);
    opts?.onToast?.(payload);
  }, [opts]);

  const handleNavigate = useCallback((payload: { view: string }) => {
    opts?.onNavigate?.(payload.view);
  }, [opts]);

  useEffect(() => {
    window.__creeky_toast = handleToast as unknown as Window["__creeky_toast"];
    window.__creeky_navigate = handleNavigate as unknown as Window["__creeky_navigate"];
    return () => {
      delete window.__creeky_toast;
      delete window.__creeky_navigate;
    };
  }, [handleToast, handleNavigate]);

  return { lastToast };
}
