import { useState } from "react";

export type CalendarMode = "year" | "month" | "week" | "day" | "mdays" | "mweeks";

export interface CalendarViewState {
  offset: number;
  list: string;
  onlyTime: boolean;
  mode: CalendarMode;
}

/**
 * Manages calendar view state as a single object.
 */
export function useCalendarView() {
  const [view, setView] = useState<CalendarViewState>({ offset: 0, list: "all", onlyTime: false, mode: "month" });

  const setMode = (mode: CalendarMode) => setView((p) => ({ ...p, mode, offset: 0 }));
  const setOffset = (offset: number) => setView((p) => ({ ...p, offset }));
  const setList = (list: string) => setView((p) => ({ ...p, list }));
  const setOnlyTime = (onlyTime: boolean) => setView((p) => ({ ...p, onlyTime }));
  const navigate = (delta: number) => setView((p) => ({ ...p, offset: delta === 0 ? 0 : p.offset + delta }));
  const reset = () => setView({ offset: 0, list: "all", onlyTime: false, mode: "month" });

  return { view, setView, setMode, setOffset, setList, setOnlyTime, navigate, reset };
}
