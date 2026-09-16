import { useMemo } from "react";
import type { CreekyDB } from "@/types/creeky";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";

/**
 * Derives badge counts for the sidebar from the store.
 */
export function useBadges(store: CreekyDB) {
  return useMemo(() => {
    const alive = store.tasks.filter((t) => !t.deleted);
    const today = todayISO();
    const unread = store.notifications.filter((n) => n.unread).length;
    const pomoReserved = alive.filter((t) => !t.done && Array.isArray(t.pomodoroBlocks) && t.pomodoroBlocks.length > 0).length;
    const pomoTodayLog = store.pomoLog.filter((p) => p.date === today && p.mode === "focus").length;
    const manualPending = store.countdowns.filter((c) => c.date >= today).length;
    const autoPending = alive.filter((t) => !t.done && t.due && t.due >= today).length;
    const matrixCount = (["q1", "q2", "q3", "q4"] as const).reduce((a, q) => a + (store.matrix[q] || []).length, 0);

    return {
      "tasks-badge": alive.filter((t) => !t.done).length,
      "notif-badge": unread,
      "badge-calendar": alive.filter((t) => !t.done && occursOn(t, today)).length,
      "badge-pomodoro": pomoTodayLog + (pomoReserved > 0 ? pomoReserved : 0),
      "badge-eisenhower": alive.filter((t) => !t.done).length + matrixCount,
      "badge-habits": store.habits.length,
      "badge-countdown": manualPending + autoPending,
    } satisfies Record<string, number>;
  }, [store]);
}
