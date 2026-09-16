import { useCallback, useEffect, useState } from "react";

export interface FocusPayload {
  id: string;
  title: string;
}

const KEY = "creeky_focus";

function readFocus(): FocusPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return { id: "", title: parsed };
    if (parsed && typeof parsed.title === "string") return { id: parsed.id ?? "", title: parsed.title };
    return null;
  } catch {
    return null;
  }
}

/**
 * useCreekyFocus — manages Pomodoro focus task persisted in localStorage.
 */
export function useCreekyFocus() {
  const [focus, setFocusState] = useState<FocusPayload | null>(() => readFocus());

  const setFocus = useCallback((payload: FocusPayload | null) => {
    if (payload) {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(KEY);
    }
    setFocusState(payload);
  }, []);

  const clear = useCallback(() => setFocus(null), [setFocus]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setFocusState(readFocus());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { focus, setFocus, clear, focusId: focus?.id ?? null };
}
