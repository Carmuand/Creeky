import type { CreekyDB, Task } from "@/types/creeky";
import { toMin, weekdayOfISO } from "./date";

/**
 * Returns the time slot occupied by a scheduled task.
 *
 * @param t - Task with its due date, time and duration.
 * @returns Start and end in minutes of the day, or null when the task has no time.
 */
export function slotOf(t: Pick<Task, "due" | "dueTime" | "duration">): { start: number; end: number } | null {
  if (!t.due || !t.dueTime) return null;
  const start = toMin(t.dueTime);
  return { start, end: start + (+t.duration || 30) };
}

/**
 * Finds an active task whose time slot overlaps the candidate's.
 *
 * @param s - Application state holding the tasks.
 * @param cand - Task being scheduled.
 * @param ignoreId - Identifier of a task to skip, usually the candidate itself.
 * @returns The conflicting task, or null when the slot is free.
 */
export function findConflict(s: CreekyDB, cand: Pick<Task, "due" | "dueTime" | "duration">, ignoreId: string | null = null): Task | null {
  const slot = slotOf(cand);
  if (!slot) return null;
  return (
    s.tasks.find((t) => {
      if (t.deleted || t.done || t.id === ignoreId) return false;
      if (t.due !== cand.due) return false;
      const o = slotOf(t);
      if (!o) return false;
      return slot.start < o.end && o.start < slot.end;
    }) || null
  );
}

/**
 * Computes the reminder moment of a scheduled task.
 *
 * @param t - Task with its due date, time and lead time.
 * @returns The reminder as YYYY-MM-DDTHH:mm, or null when the task has no date, time or lead time.
 */
export function buildReminder(t: Pick<Task, "due" | "dueTime" | "remindBefore">): string | null {
  if (!t.due || !t.dueTime || !((t.remindBefore ?? 0) > 0)) return null;
  const dt = new Date(`${t.due}T${t.dueTime}`);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setMinutes(dt.getMinutes() - t.remindBefore);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/**
 * Tells whether a task falls on a date, by due date or by weekly repetition.
 *
 * @param t - Task to check.
 * @param iso - Date as YYYY-MM-DD.
 * @returns True when the task occurs on that date.
 */
export function occursOn(t: Task, iso: string): boolean {
  if (t.deleted) return false;
  if (t.due === iso) return true;
  if (Array.isArray(t.repeat) && t.repeat.length) {
    if (!t.due || iso >= t.due) return t.repeat.includes(weekdayOfISO(iso));
  }
  return false;
}

/**
 * Returns the color of a list.
 *
 * @param s - Application state holding the lists.
 * @param listId - List identifier.
 * @returns The list color, or a neutral gray when the list is missing.
 */
export function listColor(s: CreekyDB, listId: string): string {
  return s.lists.find((l) => l.id === listId)?.color || "#616161";
}
