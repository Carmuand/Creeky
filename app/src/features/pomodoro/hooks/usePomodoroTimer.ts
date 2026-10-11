import { useCallback, useEffect, useState } from "react";

/**
 * Countdown state shared by every consumer of the timer.
 */
type TimerState = {
  total: number;
  left: number;
  mode: number;
  running: boolean;
};

const globalState: TimerState = { total: 25 * 60, left: 25 * 60, mode: 25, running: false };

const listeners = new Set<() => void>();
let interval: number | null = null;

/**
 * Notifies every subscribed component that the timer changed.
 */
function persist() {
  listeners.forEach((l) => l());
}

/**
 * Starts the one-second tick when it is not already running.
 */
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

/**
 * Stops the tick while the timer is paused.
 */
function clearIntervalIfNeeded() {
  if (!globalState.running && interval) {
    window.clearInterval(interval);
    interval = null;
  }
}

/**
 * Global Pomodoro timer kept in memory for the lifetime of the window, so
 * it keeps counting while the user moves between views.
 *
 * @returns The timer state with its controls.
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
    if (globalState.running) return;
    if (globalState.mode === mode) return;
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