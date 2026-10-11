import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ICON } from "@/types/creeky";
import type { Task } from "@/types/creeky";
import type { NotificationInput } from "@/types/pywebview";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import type { ToastFn } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { usePrioMeta, useRemindOptions, useWeekdays } from "@/i18n/labels";
import { listsApi, notificationsApi, tagsApi, tasksApi } from "@/services/api";
import { calcPomodoroBlocks } from "@/utils/pomodoro";
import { buildReminder, findConflict } from "@/utils/task";
import { Icon } from "@/components/icons/Icon";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmojiField } from "./EmojiField";

const PALETTE = ["#212121", "#616161", "#3949AB", "#00897B", "#2E7D32", "#B58900", "#C62828", "#6A1B9A", "#EF6C00", "#0277BD"];

const DURATIONS = [15, 30, 45, 60, 90, 120];

/**
 * Properties for the {@link QuickAddModal} component.
 */
interface QuickAddModalProps {
  /** Controls the visibility of the modal. */
  open: boolean;
  /** Called when the modal requests to close. */
  onClose: () => void;
  /** List and due date preselected in the form. */
  preset?: Partial<Pick<Task, "list" | "due">>;
  /** Shows a toast. */
  onToast: ToastFn;
}

/**
 * State of the new task form.
 */
interface QuickForm {
  title: string;
  desc: string;
  list: string;
  priority: Task["priority"];
  due: string;
  dueTime: string;
  duration: number;
  remindBefore: number;
  tags: string;
  pomodoro: boolean;
  repeat: Set<number>;
}

/**
 * Modal that creates a task with schedule, reminder, repetition, tags and
 * an optional Pomodoro reservation.
 *
 * @param props - Component properties.
 * @returns The new task modal, or null while closed.
 */
export function QuickAddModal({ open, onClose, preset, onToast }: QuickAddModalProps) {
  const { store } = useCreekyStore();
  const { t } = useI18n();
  const PRIO_META = usePrioMeta();
  const REMIND_OPTIONS = useRemindOptions();
  const WEEKDAYS = useWeekdays();
  const defaultList = preset?.list ?? store.lists[0]?.id ?? "inbox";
  const emptyForm = (): QuickForm => ({
    title: "",
    desc: "",
    list: defaultList,
    priority: "none",
    due: preset?.due ?? "",
    dueTime: "",
    duration: 30,
    remindBefore: 15,
    tags: "",
    pomodoro: false,
    repeat: new Set(),
  });
  const [form, setForm] = useState<QuickForm>(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open, preset]);

  const update = <K extends keyof QuickForm>(key: K, value: QuickForm[K]) => setForm((p) => ({ ...p, [key]: value }));

  const pomoPreview = useMemo(() => {
    if (!form.pomodoro) return null;
    const blocks = calcPomodoroBlocks(form.duration);
    return { blocks, focus: blocks.filter((b) => b.type === "focus").length, mins: blocks.reduce((a, b) => a + b.duration, 0) };
  }, [form.pomodoro, form.duration]);

  if (!open) return null;

  const durationLabel = (minutes: number) => (minutes < 60 ? t("duration.minutes", { count: minutes }) : t(minutes === 60 ? "duration.hour" : "duration.hours", { count: minutes / 60 }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const tagList = [...new Set(form.tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean))];
    const pomodoroBlocks = form.pomodoro ? calcPomodoroBlocks(form.duration) : [];
    const schedule = { due: form.due, dueTime: form.dueTime, duration: form.duration, remindBefore: form.remindBefore };
    const clash = findConflict(store, schedule);
    if (clash) {
      onToast(t("quick.toast.clash", { title: clash.title, time: clash.dueTime }), "error");
      return;
    }
    const reminder = buildReminder(schedule) ?? "";
    const notifications: NotificationInput[] = [];
    if (reminder) notifications.push({ title: t("notif.reminder.title"), text: t("notif.reminder.text", { title, minutes: form.remindBefore }), kind: "reminder" });
    if (form.due) notifications.push({ title: t("notif.calendar.title"), text: t("notif.calendar.scheduled", { title, when: `${form.due}${form.dueTime ? ` ${form.dueTime}` : ""}` }), kind: "calendar" });
    if (pomodoroBlocks.length > 0) {
      const count = pomodoroBlocks.filter((b) => b.type === "focus").length;
      const minutes = pomodoroBlocks.reduce((a, b) => a + b.duration, 0);
      notifications.push({ title: t("notif.pomodoro.reserved"), text: t("notif.pomodoro.readyText", { title, count, minutes }), kind: "system" });
    }
    try {
      await tasksApi.create({
        title,
        description: form.desc.trim(),
        list: form.list,
        priority: form.priority,
        ...schedule,
        repeat: [...form.repeat],
        reminder,
        pomodoroBlocks,
        tags: tagList,
      });
      if (notifications.length) await notificationsApi.create(notifications);
      onClose();
      onToast(t("quick.toast.created"), "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-140 max-h-[90vh]">
      <ModalHeader title={t("quick.title")} onClose={onClose} />
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-1 flex-col min-h-0">
        <ModalBody className="gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("quick.field.title")}</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="pencil" size={16} /></span>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={t("quick.field.title.placeholder")} required autoFocus className="pl-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("filters.list")}</label>
              <Select value={form.list} onChange={(v) => update("list", v)} options={store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))} placeholder={t("quick.field.list.placeholder")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("common.priority")}</label>
              <div className="flex gap-2">
                {(["high", "medium", "low", "none"] as const).map((v) => {
                  const isSelected = form.priority === v;
                  const tint: Record<string, string> = { high: "bg-[#fff0f0]", medium: "bg-[#fff8e6]", low: "bg-[#eef7ee]", none: "bg-(--bg-primary)" };
                  return (
                    <button key={v} type="button" onClick={() => update("priority", v)} className={`flex h-12 w-14.5 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-xs transition-all ${isSelected ? `border-(--accent) shadow-sm -translate-y-0.5 ${tint[v]}` : "border-(--border-light) bg-(--bg-secondary) hover:-translate-y-0.5 hover:shadow-sm hover:border-(--border-medium)"}`}>
                      <span className="text-[15px] font-extrabold leading-none" style={{ color: PRIO_META[v].color }}>{PRIO_META[v].mark}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-90" style={{ color: PRIO_META[v].color }}>{PRIO_META[v].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("task.description")}</label>
            <Textarea value={form.desc} onChange={(e) => update("desc", e.target.value)} placeholder={t("quick.field.desc.placeholder")} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("task.date")}</label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="calendar" size={16} /></span>
                <Input type="date" value={form.due} onChange={(e) => update("due", e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("task.time")}</label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="clock" size={16} /></span>
                <Input type="time" value={form.dueTime} onChange={(e) => update("dueTime", e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("task.duration")}</label>
              <Select value={String(form.duration)} onChange={(v) => update("duration", Number(v))} options={DURATIONS.map((minutes) => ({ value: String(minutes), label: durationLabel(minutes) }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">{t("task.remind")}</label>
              <Select value={String(form.remindBefore)} onChange={(v) => update("remindBefore", Number(v))} options={REMIND_OPTIONS.map((o) => ({ value: String(o.v), label: o.label }))} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("quick.field.repeat")}</label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((w) => (
                <button key={w.v} type="button" onClick={() => setForm((p) => { const n = new Set(p.repeat); if (n.has(w.v)) n.delete(w.v); else n.add(w.v); return { ...p, repeat: n }; })} className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${form.repeat.has(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{w.label}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-(--text-soft)"><Icon name="timer" size={15} /> {t("quick.pomodoro.title")} <span className="text-xs font-normal text-(--muted)">{t("quick.pomodoro.optional")}</span></span>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={form.pomodoro} onChange={(e) => update("pomodoro", e.target.checked)} className="h-4 w-4 rounded border-(--border-medium) text-(--accent) focus:ring-(--accent)" />
              <span className="text-sm text-(--text-soft)">{t("quick.pomodoro.check")}</span>
            </label>
            {pomoPreview ? (
              <div className="rounded-md bg-(--bg-primary) border border-(--border-light) p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {pomoPreview.blocks.map((b, i) => <span key={i} className={`h-3 w-3 rounded-full ${b.type === "focus" ? "bg-(--accent)" : b.type === "shortBreak" ? "bg-(--muted)" : "bg-(--accent-light)"}`} />)}
                  <span className="ml-1 text-xs font-medium text-(--muted)">{t("quick.pomodoro.preview", { count: pomoPreview.focus, minutes: pomoPreview.mins })}</span>
                </div>
                <p className="mt-1.5 text-xs text-(--muted)">{t("quick.pomodoro.hint")}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("task.tags")}</label>
            <div className="relative flex items-center">
              <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder={t("quick.field.tags.placeholder")} list="tag-options-modal" className="pr-10" />
              <span className="pointer-events-none absolute right-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="tag" size={16} /></span>
            </div>
            <datalist id="tag-options-modal">{store.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary">{t("common.save")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/**
 * State of the list form.
 */
interface ListForm {
  name: string;
  desc: string;
  color: string;
  icon: string;
}

/**
 * Modal that creates, edits or deletes a task list.
 *
 * @param props - Component properties.
 * @param props.open - Controls the visibility of the modal.
 * @param props.onClose - Called when the modal requests to close.
 * @param props.editId - Identifier of the list being edited, or null to create one.
 * @param props.onToast - Shows a toast.
 * @returns The list modal, or null while closed.
 */
export function ListModal({ open, onClose, editId, onToast }: { open: boolean; onClose: () => void; editId: string | null; onToast: ToastFn }) {
  const { store } = useCreekyStore();
  const { t } = useI18n();
  const editing = editId ? store.lists.find((l) => l.id === editId) ?? null : null;
  const [form, setForm] = useState<ListForm>({ name: "", desc: "", color: "#3949AB", icon: DEFAULT_LIST_ICON });

  useEffect(() => {
    if (open) setForm({ name: editing?.name ?? "", desc: editing?.description ?? "", color: editing?.color ?? "#3949AB", icon: editing?.icon ?? DEFAULT_LIST_ICON });
  }, [open, editId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const payload = { name, description: form.desc.trim(), color: form.color, icon: form.icon || DEFAULT_LIST_ICON };
    try {
      if (editing) {
        await listsApi.update(editing.id, payload);
        onClose();
        onToast(t("lists.toast.updated", { icon: payload.icon, name }), "success");
      } else {
        await listsApi.create(payload);
        onClose();
        onToast(t("lists.toast.created", { icon: payload.icon, name }), "success");
      }
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      const count = await listsApi.remove(editing.id);
      onClose();
      onToast(t("lists.toast.deleted", { name: editing.name, count }), "warning");
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-130 max-h-[90vh]">
      <ModalHeader title={editing ? t("lists.modal.edit") : t("lists.new")} onClose={onClose} />
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("common.name")}</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder={t("lists.modal.name.placeholder")} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("task.description")}</label><Input value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} placeholder={t("common.optional")} /></div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("lists.modal.color")}</label>
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-8 rounded-full border-0 p-0" />
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <TooltipSimple key={c} content={c} side="top">
                    <button type="button" aria-label={c} onClick={() => setForm((p) => ({ ...p, color: c }))} className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-black shadow-sm" : "border-transparent"}`} style={{ background: c }} />
                  </TooltipSimple>
                ))}
              </div>
            </div>
          </div>
          <EmojiField value={form.icon} onChange={(icon) => setForm((p) => ({ ...p, icon }))} />
        </ModalBody>
        <ModalFooter>
          {editing ? <div className="flex items-center gap-2"><span className="text-sm text-(--muted)">{t("common.delete")}</span><DeleteButton onConfirm={() => { void handleDelete(); }} className="scale-[0.58] origin-left -my-2" /></div> : <span />}
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary">{editing ? t("common.saveChanges") : t("lists.modal.create")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/**
 * Modal that creates a tag.
 *
 * @param props - Component properties.
 * @param props.open - Controls the visibility of the modal.
 * @param props.onClose - Called when the modal requests to close.
 * @param props.onToast - Shows a toast.
 * @returns The tag modal, or null while closed.
 */
export function TagModal({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: ToastFn }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(""); }, [open]);
  if (!open) return null;
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = name.trim().toLowerCase();
    if (!v) return;
    try {
      await tagsApi.create(v);
      onClose();
      onToast(t("tags.toast.created", { name: v }), "success");
    } catch (error) {
      const exists = error instanceof Error && error.message === "tag_exists";
      onToast(exists ? t("tags.toast.exists", { name: v }) : errorMessage(error), exists ? "warning" : "error");
    }
  };
  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-105 max-h-[90vh]">
      <ModalHeader title={t("tags.new")} onClose={onClose} />
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col">
        <ModalBody>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("common.name")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("tags.modal.placeholder")} required autoFocus />
            <div className="mt-1 text-xs text-(--muted)">{t("tags.modal.preview")} <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">#{name.trim().toLowerCase() || t("tags.modal.fallback")}</span></div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary">{t("common.create")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
