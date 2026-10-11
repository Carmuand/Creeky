import { useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { useI18n } from "@/i18n";
import { usePrioMeta } from "@/i18n/labels";
import { listColor } from "@/utils/task";
import { Icon } from "@/components/icons/Icon";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { DeleteButton } from "@/components/ui/delete-button";
import { TaskDetailModal } from "./TaskDetailModal";
import { navigateToCalendar } from "@/utils/navigation";

/**
 * Properties for the {@link TaskItem} component.
 */
interface TaskItemProps {
  /** Task to render. */
  task: Task;
  /** Application state used to resolve the list. */
  store: CreekyDB;
  /** Whether the inline detail is expanded. */
  isOpen: boolean;
  /** Identifier of the task focused in the Pomodoro view. */
  focusId: string | null;
  /** Whether the task is shown inside the trash. */
  isTrash: boolean;
  /** Called to expand or collapse the inline detail. */
  onToggle: () => void;
  /** Called to complete or reopen the task. */
  onCheck: () => void;
  /** Called to move the task to the trash. */
  onDelete: () => void;
  /** Called to restore the task from the trash. */
  onRestore: () => void;
  /** Called to delete the task permanently. */
  onPermDelete: () => void;
  /** Called to advance the priority. */
  onCyclePrio: () => void;
  /** Called to focus the task in the Pomodoro view. */
  onFocus: () => void;
  /** Called to save the detail form; resolves to true when saved. */
  onSaveDetail: (patch: Partial<Task>) => Promise<boolean>;
  /** Called to toggle a repetition weekday. */
  onRepeatToggle: (day: number) => void;
  /** Called to move the task to another list. */
  onMove: (listId: string) => void;
}

/**
 * Task row with its chips, quick actions and detail modal.
 *
 * @param props - Component properties.
 * @returns The task row.
 */

export function TaskItem({ task: t, store, focusId, isTrash, onCheck, onDelete, onRestore, onPermDelete, onCyclePrio, onFocus, onSaveDetail, onRepeatToggle, onMove }: Omit<TaskItemProps, "isOpen" | "onToggle"> & Partial<Pick<TaskItemProps, "isOpen" | "onToggle">>) {
  const { t: tr } = useI18n();
  const PRIO_META = usePrioMeta();
  const prio = t.priority || "none";
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <article
        className={`flex gap-3 items-start p-3 border rounded-lg bg-(--bg-primary) transition-all ${t.done ? "opacity-65" : "hover:border-(--border-dark) hover:shadow-sm"} border-(--border-light)`}
        style={{ borderLeft: `4px solid ${listColor(store, t.list)}` }}
      >
        <button
          className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 text-sm ${t.done ? "bg-(--secondary) border-(--secondary) text-white" : "border-(--border-dark) text-transparent"}`}
          onClick={onCheck}
          aria-label={tr("task.aria.check")}
        >
          {t.done ? "✓" : ""}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`font-medium text-[15px] ${t.done ? "line-through opacity-70" : ""}`}>{t.title}</div>
          <button className="text-xs text-(--muted) underline hover:text-(--accent) mt-1" onClick={() => setDetailOpen(true)}>
            {tr("task.viewDetails")}
          </button>

        <div className="flex flex-wrap gap-2 mt-2 text-xs text-(--muted)">
          {t.due ? <TooltipSimple content={tr("task.viewInCalendar")} side="top"><button onClick={navigateToCalendar} className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 hover:border-(--accent) hover:text-(--accent) transition-colors">{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</button></TooltipSimple> : null}
          {(t.repeat || []).length ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">↻ <b>{(t.repeat || []).length}</b>d</span> : null}
          {(t.remindBefore ?? 0) > 0 && t.due ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">{tr("task.chip.remind", { minutes: t.remindBefore })}</span> : null}
          {t.reminder ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">{String(t.reminder).slice(0, 16).replace("T", " ")}</span> : null}
          <button className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 flex items-center gap-1" onClick={onCyclePrio}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[prio].color }}>{PRIO_META[prio].mark}</span> {PRIO_META[prio].label}
          </button>
          {(t.pomo || 0) > 0 ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">pomodoro ×{t.pomo}</span> : null}
          {(t.tags || []).map((x) => <span key={x} className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">#{x}</span>)}
        </div>
      </div>

      <div className="flex gap-0.5 items-center shrink-0">
        <TooltipSimple content={tr("task.viewDetails")} side="top"><button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={() => setDetailOpen(true)} aria-label={tr("task.aria.details")}><Icon name="calendar" size={16} /></button></TooltipSimple>
        <TooltipSimple content={tr("task.reminderAlarm")} side="top"><button className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-(--bg-hover) ${(t.reminder || t.dueTime) ? "text-(--accent) bg-(--accent-light)" : "text-(--muted) hover:text-(--text)"}`} onClick={() => setDetailOpen(true)} aria-label={tr("task.aria.alarm")}><Icon name="bell" size={16} /></button></TooltipSimple>
        <TooltipSimple content={tr("task.focusPomodoro")} side="top"><button className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-(--bg-hover) ${focusId === t.id ? "text-(--accent) bg-(--accent-light)" : "text-(--muted) hover:text-(--text)"}`} onClick={onFocus} aria-label="Pomodoro"><Icon name="timer" size={16} /></button></TooltipSimple>
        <TooltipSimple content={tr("task.priorityOf", { label: PRIO_META[prio].label })} side="top"><button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={onCyclePrio} aria-label={tr("common.priority")}><Icon name="flag" size={16} /></button></TooltipSimple>
        {isTrash ? (
          <>
            <TooltipSimple content={tr("task.restore")} side="top"><button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={onRestore} aria-label={tr("task.restore")}><Icon name="restore" size={16} /></button></TooltipSimple>
            <DeleteButton onConfirm={onPermDelete} className="scale-[0.58] origin-right -my-2" />
          </>
        ) : (
          <DeleteButton onConfirm={onDelete} className="scale-[0.58] origin-right -my-2" />
        )}
      </div>
    </article>
      <TaskDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} task={t} store={store} onSave={onSaveDetail} onRepeatToggle={onRepeatToggle} onMove={onMove} />
    </>
  );
}