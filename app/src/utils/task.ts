import type { CreekyDB, Task } from "@/types/creeky";
import { toMin, weekdayOfISO } from "./date";

export function slotOf(t: Pick<Task, "due" | "dueTime" | "duration">): { start: number; end: number } | null {
  if (!t.due || !t.dueTime) return null;
  const start = toMin(t.dueTime);
  return { start, end: start + (+t.duration || 30) };
}

export function findConflict(s: CreekyDB, cand: Task, ignoreId: string | null = null): Task | null {
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

export function occursOn(t: Task, iso: string): boolean {
  if (t.deleted) return false;
  if (t.due === iso) return true;
  if (Array.isArray(t.repeat) && t.repeat.length) {
    if (!t.due || iso >= t.due) return t.repeat.includes(weekdayOfISO(iso));
  }
  return false;
}

export function listColor(s: CreekyDB, listId: string): string {
  return s.lists.find((l) => l.id === listId)?.color || "#616161";
}
