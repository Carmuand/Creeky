import type { ToastFn } from "@/hooks/useToast";
import { errorMessage, t } from "@/i18n";
import { notificationsApi, tasksApi } from "@/services/api";
import { getStore } from "@/services/store";
import { todayISO } from "@/utils/date";
import { calcPomodoroBlocks } from "@/utils/pomodoro";
import { buildReminder, findConflict } from "@/utils/task";
import type { Task } from "@/types/creeky";
import type { NotificationInput, TaskPatch } from "@/types/pywebview";

const PRIO_ORDER: Task["priority"][] = ["none", "low", "medium", "high"];

/**
 * Dependencies of the task actions.
 */
interface TaskActionOptions {
  /** Shows a toast. */
  toast: ToastFn;
  /** Sets the task focused in the Pomodoro view. */
  setFocus: (payload: { id: string; title: string } | null) => void;
  /** Collapses the inline detail of a task. */
  closeDetail: (id: string) => void;
}

/**
 * Builds the task actions used by the tasks view. Every action persists
 * through the backend API and reports failures with a toast.
 *
 * @param opts - Callbacks the actions depend on.
 * @returns The task actions.
 */
export function createTaskActions(opts: TaskActionOptions) {
  const { toast, setFocus, closeDetail } = opts;

  const find = (id: string): Task | undefined => getStore().tasks.find((task) => task.id === id);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (error) {
      toast(errorMessage(error), "error");
      return false;
    }
  };

  const update = async (id: string, patch: TaskPatch, notifications: NotificationInput[] = []): Promise<void> => {
    await tasksApi.update(id, patch);
    if (notifications.length) await notificationsApi.create(notifications);
  };

  return {
    /**
     * Creates a task from the inline input of the active filter.
     *
     * @param title - Task title.
     * @param filter - Active list filter.
     * @returns Promise resolved once the task is stored.
     */
    async createInline(title: string, filter: string): Promise<void> {
      const value = title.trim();
      if (!value) return;
      const due = filter === "today" ? todayISO() : "";
      const ok = await run(async () => {
        await tasksApi.create({ title: value, list: ["all", "today"].includes(filter) ? "inbox" : filter, due });
        if (due) await notificationsApi.create([{ title: t("notif.calendar.title"), text: t("notif.calendar.scheduled", { title: value, when: due }), kind: "calendar" }]);
      });
      if (ok) toast(t("tasks.toast.created"), "success");
    },

    /**
     * Completes or reopens a task.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the change is stored.
     */
    async toggleDone(id: string): Promise<void> {
      const task = find(id);
      if (!task) return;
      const done = !task.done;
      const notifications: NotificationInput[] = task.due
        ? [{ title: t("notif.calendar.title"), text: t(done ? "notif.calendar.completed" : "notif.calendar.reopened", { title: task.title, when: task.due }), kind: "calendar" }]
        : [];
      if (await run(() => update(id, { done }, notifications))) toast(done ? t("tasks.toast.completed") : t("tasks.toast.reopened"), "info");
    },

    /**
     * Moves a task to the trash.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the change is stored.
     */
    async softDelete(id: string): Promise<void> {
      const task = find(id);
      if (!task) return;
      const notifications: NotificationInput[] = task.due
        ? [{ title: t("notif.calendar.title"), text: t("notif.calendar.removed", { title: task.title }), kind: "calendar" }]
        : [];
      if (await run(() => update(id, { deleted: true }, notifications))) toast(t("tasks.toast.trashed"), "warning");
    },

    /**
     * Restores a task from the trash.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the change is stored.
     */
    async restore(id: string): Promise<void> {
      if (await run(() => update(id, { deleted: false }))) toast(t("tasks.toast.restored"), "success");
    },

    /**
     * Permanently deletes a task.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the task is deleted.
     */
    async permDelete(id: string): Promise<void> {
      if (await run(async () => { await tasksApi.remove(id); })) toast(t("tasks.toast.deleted"), "info");
    },

    /**
     * Permanently deletes every trashed task.
     *
     * @returns Promise resolved once the trash is empty.
     */
    async emptyTrash(): Promise<void> {
      let removed = 0;
      if (await run(async () => { removed = await tasksApi.emptyTrash(); })) toast(t("tasks.toast.trashEmptied", { count: removed }), "warning");
    },

    /**
     * Advances a task to the next priority level.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the change is stored.
     */
    async cyclePrio(id: string): Promise<void> {
      const task = find(id);
      if (!task) return;
      const priority = PRIO_ORDER[(PRIO_ORDER.indexOf(task.priority) + 1) % PRIO_ORDER.length];
      await run(() => update(id, { priority }));
    },

    /**
     * Moves a task to another list, restoring it when trashed.
     *
     * @param id - Task identifier.
     * @param targetList - Destination list identifier.
     * @returns Promise resolved once the change is stored.
     */
    async move(id: string, targetList: string): Promise<void> {
      const task = find(id);
      if (!task) return;
      const target = getStore().lists.find((list) => list.id === targetList);
      closeDetail(id);
      if (await run(() => update(id, { list: targetList, deleted: false }))) toast(t("tasks.toast.moved", { title: task.title, list: target ? target.name : targetList }), "success");
    },

    /**
     * Adds or removes a weekday from the repetition of a task.
     *
     * @param id - Task identifier.
     * @param day - Weekday, 0 for Sunday through 6 for Saturday.
     * @returns Promise resolved once the change is stored.
     */
    async toggleRepeat(id: string, day: number): Promise<void> {
      const task = find(id);
      if (!task) return;
      const current = task.repeat || [];
      const repeat = current.includes(day) ? current.filter((value) => value !== day) : [...current, day];
      if (await run(() => update(id, { repeat }))) toast(repeat.length ? t("tasks.toast.repeatSet", { count: repeat.length }) : t("tasks.toast.repeatCleared"), "info");
    },

    /**
     * Focuses a task in the Pomodoro view, reserving its blocks the first time.
     *
     * @param id - Task identifier.
     * @returns Promise resolved once the reservation is stored.
     */
    async reservePomodoro(id: string): Promise<void> {
      const task = find(id);
      if (!task) return;
      const wasEmpty = !Array.isArray(task.pomodoroBlocks) || task.pomodoroBlocks.length === 0;
      const blocks = wasEmpty ? calcPomodoroBlocks(task.duration || 30) : task.pomodoroBlocks;
      const focusCount = blocks.filter((block) => block.type === "focus").length;
      const ok = await run(async () => {
        if (wasEmpty) {
          const minutes = blocks.reduce((total, block) => total + block.duration, 0);
          const slot = `${task.due || t("common.noDate")} ${task.dueTime || ""}`.trim();
          await update(id, { pomodoroBlocks: blocks }, [{ title: t("notif.pomodoro.reserved"), text: t("notif.pomodoro.reservedText", { title: task.title, count: focusCount, minutes, slot }), kind: "system" }]);
        }
      });
      if (!ok) return;
      setFocus({ id: task.id, title: task.title });
      toast(wasEmpty ? t("tasks.toast.pomodoroReserved", { count: focusCount, title: task.title }) : t("tasks.toast.pomodoroFocus", { title: task.title }), "success");
    },

    /**
     * Saves the detail form of a task, rejecting overlapping time slots.
     *
     * @param id - Task identifier.
     * @param patch - Edited fields.
     * @returns True when the task was saved.
     */
    async saveDetail(id: string, patch: Partial<Task>): Promise<boolean> {
      const task = find(id);
      if (!task) return false;
      const candidate = { ...task, ...patch } as Task;
      const clash = findConflict(getStore(), candidate, task.id);
      if (clash) {
        toast(t("tasks.toast.clash", { title: clash.title, time: clash.dueTime, duration: clash.duration || 30 }), "error");
        return false;
      }
      const reminder = buildReminder(candidate) ?? candidate.reminder;
      const notifications: NotificationInput[] = [];
      if (reminder) notifications.push({ title: t("notif.reminder.title"), text: t("notif.reminder.textAt", { title: candidate.title, minutes: candidate.remindBefore, when: reminder.replace("T", " ") }), kind: "reminder" });
      if (candidate.due) {
        const when = `${candidate.due}${candidate.dueTime ? ` ${candidate.dueTime}` : ""}${(candidate.repeat || []).length ? ` ${t("notif.calendar.repeats")}` : ""}`;
        notifications.push({ title: t("notif.calendar.title"), text: t("notif.calendar.scheduled", { title: candidate.title, when }), kind: "calendar" });
      }
      closeDetail(id);
      const ok = await run(() => update(id, { ...patch, reminder, reminded: false }, notifications));
      if (ok) toast(t("tasks.toast.scheduled"), "success");
      return ok;
    },

    /**
     * Handles a card dropped on a board column or on the trash column.
     *
     * @param dragId - Identifier of the dragged task.
     * @param zone - Destination list identifier, or `__trash`.
     * @returns Promise resolved once the change is stored.
     */
    async handleBoardDrop(dragId: string, zone: string): Promise<void> {
      const task = find(dragId);
      if (!task) return;
      if (zone === "__trash") {
        if (task.deleted) return;
        if (await run(() => update(dragId, { deleted: true }))) toast(t("tasks.toast.movedToTrash", { title: task.title }), "warning");
      } else if (task.list !== zone || task.deleted) {
        const target = getStore().lists.find((list) => list.id === zone);
        if (await run(() => update(dragId, { list: zone, deleted: false }))) toast(t("tasks.toast.moved", { title: task.title, list: target ? target.name : zone }), "success");
      }
    },
  };
}
