import { useEffect, useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { useI18n } from "@/i18n";
import { usePrioMeta, useRemindOptions, useWeekdays } from "@/i18n/labels";
import { Icon } from "@/components/icons/Icon";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { todayISO, addDaysISO } from "@/utils/date";

/**
 * Properties for the {@link TaskDetailModal} component.
 */
interface TaskDetailModalProps {
  /** Controls the visibility of the modal. */
  open: boolean;
  /** Called when the modal requests to close. */
  onClose: () => void;
  /** Task shown and edited. */
  task: Task;
  /** Application state used to resolve lists. */
  store: CreekyDB;
  /** Saves the edited fields; resolves to true when saved. */
  onSave: (patch: Partial<Task>) => Promise<boolean>;
  /** Called to toggle a repetition weekday. */
  onRepeatToggle: (day: number) => void;
  /** Called to move the task to another list. */
  onMove: (listId: string) => void;
}

/**
 * Modal with view and edit modes for a task.
 *
 * @param props - Component properties.
 * @returns The task detail modal.
 */
export function TaskDetailModal({ open, onClose, task, store, onSave, onRepeatToggle: _onRepeatToggle, onMove }: TaskDetailModalProps) {
  void _onRepeatToggle;
  const { t } = useI18n();
  const PRIO_META = usePrioMeta();
  const REMIND_OPTIONS = useRemindOptions();
  const WEEKDAYS = useWeekdays();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({
    description: task.description,
    due: task.due || "",
    dueTime: task.dueTime || "",
    duration: String(task.duration || 30),
    remindBefore: String(task.remindBefore ?? 15),
    priority: (task.priority || "none") as Task["priority"],
    tags: (task.tags || []).join(", "),
    repeat: [...(task.repeat || [])] as number[],
  });

  useEffect(() => {
    if (open) {
      setMode("view");
      setForm({
        description: task.description,
        due: task.due || "",
        dueTime: task.dueTime || "",
        duration: String(task.duration || 30),
        remindBefore: String(task.remindBefore ?? 15),
        priority: (task.priority || "none") as Task["priority"],
        tags: (task.tags || []).join(", "),
        repeat: [...(task.repeat || [])] as number[],
      });
    }
  }, [open, task.id]);

  const handleSave = async () => {
    const tags = form.tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    const ok = await onSave({
      description: form.description,
      due: form.due,
      dueTime: form.dueTime,
      duration: Number(form.duration) || 30,
      remindBefore: Number(form.remindBefore) ?? 15,
      priority: form.priority,
      tags: [...new Set(tags)],
      repeat: [...form.repeat],
    });
    if (ok) setMode("view");
  };

  const list = store.lists.find((l) => l.id === task.list);

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-140 max-h-[90vh]">
      <ModalHeader title={task.title} subtitle={list ? `${list.icon} ${list.name}` : undefined} onClose={onClose} />
      <ModalBody className="gap-4">
        {mode === "view" ? (
          <>
            <div className="rounded-lg border border-(--border-light) bg-(--bg-secondary) p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("task.description")}</h4>
              {task.description ? (
                <p className="max-h-45 overflow-y-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-(--text)">{task.description}</p>
              ) : (
                <p className="text-sm italic text-(--muted)">{t("task.noDescription")}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="rounded-lg border border-(--border-light) bg-(--bg-primary) p-3">
                <span className="mb-1 block text-xs font-medium text-(--muted)">{t("task.date")}</span>
                <span className="flex items-center gap-1.5 text-sm text-(--text)"><Icon name="calendar" size={16} />{task.due || t("common.noDateShort")}</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-2.5 py-1 text-xs hover:border-(--accent)" onClick={() => { setForm((p) => ({ ...p, due: todayISO() })); setMode("edit"); }}>{t("common.today")}</button>
                  <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-2.5 py-1 text-xs hover:border-(--accent)" onClick={() => { setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 1) })); setMode("edit"); }}>{t("common.tomorrow")}</button>
                </div>
              </div>
              <div className="rounded-lg border border-(--border-light) bg-(--bg-primary) p-3">
                <span className="mb-1 block text-xs font-medium text-(--muted)">{t("task.timeAndDuration")}</span>
                <span className="flex items-center gap-1.5 text-sm text-(--text)"><Icon name="clock" size={16} />{task.dueTime || "—"} • {task.duration || 30} min</span>
                <span className="mt-1 block text-xs text-(--muted)">{t("task.remindValue", { label: REMIND_OPTIONS.find((o) => String(o.v) === String(task.remindBefore))?.label ?? `${task.remindBefore} min` })}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-(--border-light) bg-(--bg-tertiary) px-2.5 py-1 text-xs"><span className="h-3 w-3 rounded-full" style={{ background: PRIO_META[task.priority || "none"].color }} />{PRIO_META[task.priority || "none"].label}</span>
              {(task.repeat || []).length ? <span className="rounded-full border border-(--border-light) bg-(--bg-tertiary) px-2.5 py-1 text-xs">↻ {task.repeat.length}d</span> : null}
              {(task.tags || []).map((x) => <span key={x} className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-1 text-xs">#{x}</span>)}
              {task.pomo ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-1 text-xs">pomodoro ×{task.pomo}</span> : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-semibold text-(--muted)">{t("task.repeatColon")}</span>
              {WEEKDAYS.map((w) => (
                <span key={w.v} className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${((task.repeat || []) as number[]).includes(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) text-(--muted)"}`}>{w.label}</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("task.description")}</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder={t("task.description.placeholder")} rows={4} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs hover:border-(--accent)" onClick={() => setForm((p) => ({ ...p, due: todayISO() }))}>{t("common.today")}</button>
              <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs hover:border-(--accent)" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 1) }))}>{t("common.tomorrow")}</button>
              <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs hover:border-(--accent)" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 7) }))}>{t("task.thisWeek")}</button>
              <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs hover:border-(--accent)" onClick={() => setForm((p) => ({ ...p, due: "" }))}>{t("common.noDateShort")}</button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.date")}</label><Input type="date" value={form.due} onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.time")}</label><Input type="time" value={form.dueTime} onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.duration")}</label><Select value={form.duration} onChange={(v) => setForm((p) => ({ ...p, duration: v }))} options={[15, 30, 45, 60, 90, 120].map((d) => ({ value: String(d), label: `${d} min` }))} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.remind")}</label><Select value={form.remindBefore} onChange={(v) => setForm((p) => ({ ...p, remindBefore: v }))} options={REMIND_OPTIONS.map((o) => ({ value: String(o.v), label: o.label }))} /></div>
            </div>

            <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("common.priority")}</label><Select value={form.priority} onChange={(v) => setForm((p) => ({ ...p, priority: v as Task["priority"] }))} options={Object.entries(PRIO_META).map(([v, m]) => ({ value: v, label: m.label, thumb: <span className="h-3 w-3 rounded-full" style={{ background: m.color }} /> }))} /></div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-(--muted)">{t("task.repeatColon")}</span>
              {WEEKDAYS.map((w) => (
                <button key={w.v} type="button" onClick={() => setForm((p) => ({ ...p, repeat: p.repeat.includes(w.v) ? p.repeat.filter((x) => x !== w.v) : [...p.repeat, w.v] }))} className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${form.repeat.includes(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) text-(--muted) hover:border-(--accent)"}`}>{w.label}</button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.moveTo")}</label><Select value={task.list} onChange={(v) => onMove(v)} options={store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))} /></div>

            <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.tags")}</label><Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder={t("task.tags.placeholderShort")} /></div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {mode === "view" ? (
          <>
            <Button variant="secondary" onClick={onClose}>{t("common.close")}</Button>
            <Button variant="primary" onClick={() => setMode("edit")}>{t("common.edit")}</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setMode("view")}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={() => { void handleSave(); }}>{t("common.save")}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
