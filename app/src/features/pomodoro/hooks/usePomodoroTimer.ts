import { useCallback, useEffect, useState } from "react";

type TimerState = {
  total: number;
  left: number;
  mode: number;
  running: boolean;
};

const KEY = "creeky_pomo_timer_v1";

let globalState: TimerState = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TimerState;
  } catch { /* ignore */ }
  return { total: 25 * 60, left: 25 * 60, mode: 25, running: false };
})();

const listeners = new Set<() => void>();
let interval: number | null = null;

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(globalState)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function ensureInterval() {
  if (interval) return;
  interval = window.setInterval(() => {
    if (!globalState.running) return;
    globalState.left -= 1;
    if (globalState.left <= 0) {
      globalState.left = 0;
      globalState.running = false;
      if (interval) { window.clearInterval(interval); interval = null; }
    }
    persist();
  }, 1000);
}

function clearIntervalIfNeeded() {
  if (!globalState.running && interval) {
    window.clearInterval(interval);
    interval = null;
  }
}

/**
 * Global pomodoro timer.
 */
export function usePomodoroTimer() {
  const [, bump] = useState(0);

  useEffect(() => {
    const cb = () => bump((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  useEffect(() => {
    if (globalState.running) ensureInterval();
    else clearIntervalIfNeeded();
  }, [globalState.running]);

  const setMode = useCallback((mode: number) => {
    globalState.mode = mode;
    globalState.total = mode * 60;
    globalState.left = mode * 60;
    globalState.running = false;
    if (interval) { window.clearInterval(interval); interval = null; }
    persist();
  }, []);

  const start = useCallback(() => {
    if (globalState.running) {
      globalState.running = false;
      if (interval) { window.clearInterval(interval); interval = null; }
      persist();
      return;
    }
    if (globalState.left <= 0) globalState.left = globalState.total;
    globalState.running = true;
    ensureInterval();
    persist();
  }, []);

  const reset = useCallback(() => {
    globalState.left = globalState.total;
    globalState.running = false;
    if (interval) { window.clearInterval(interval); interval = null; }
    persist();
  }, []);

  const complete = useCallback(() => {
    globalState.left = globalState.total;
    globalState.running = false;
    if (interval) { window.clearInterval(interval); interval = null; }
    persist();
  }, []);

  return {
    total: globalState.total,
    left: globalState.left,
    mode: globalState.mode,
    running: globalState.running,
    setMode,
    start,
    reset,
    complete,
  };
}