import { useEffect, useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { todayISO, addDaysISO } from "@/utils/date";

interface TaskDetailProps {
  task: Task;
  store: CreekyDB;
  onSave: (patch: Partial<Task>) => boolean;
  onRepeatToggle: (day: number) => void;
  onMove: (listId: string) => void;
}

export function TaskDetail({ task, store, onSave, onRepeatToggle, onMove }: TaskDetailProps) {
  const [form, setForm] = useState({
    description: task.description,
    due: task.due || "",
    dueTime: task.dueTime || "",
    duration: String(task.duration || 30),
    remindBefore: String(task.remindBefore ?? 15),
    priority: (task.priority || "none") as Task["priority"],
    tags: (task.tags || []).join(", "),
  });

  useEffect(() => {
    setForm({
      description: task.description,
      due: task.due || "",
      dueTime: task.dueTime || "",
      duration: String(task.duration || 30),
      remindBefore: String(task.remindBefore ?? 15),
      priority: (task.priority || "none") as Task["priority"],
      tags: (task.tags || []).join(", "),
    });
  }, [task]);

  const handleSave = () => {
    const tags = form.tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    onSave({
      description: form.description,
      due: form.due,
      dueTime: form.dueTime,
      duration: Number(form.duration) || 30,
      remindBefore: Number(form.remindBefore) ?? 15,
      priority: form.priority,
      tags: [...new Set(tags)],
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3">
      <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descripción…" rows={2} />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fecha rápida">
        <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={() => setForm((p) => ({ ...p, due: todayISO() }))}>Hoy</button>
        <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 1) }))}>Mañana</button>
        <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 7) }))}>Esta semana</button>
        <button className="rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={() => setForm((p) => ({ ...p, due: "" }))}>Sin fecha</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)"><Icon name="calendar" size={16} /> <Input type="date" value={form.due} onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))} className="w-auto" /></label>
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)"><Icon name="clock" size={16} /> <Input type="time" value={form.dueTime} onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))} className="w-auto" /></label>
        <div className="flex items-center gap-1.5 text-xs text-(--text-soft)">
          <span>Duración</span>
          <div className="min-w-27.5">
            <Select value={form.duration} onChange={(v) => setForm((p) => ({ ...p, duration: v }))} options={[15, 30, 45, 60, 90, 120].map((d) => ({ value: String(d), label: `${d} min` }))} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-(--text-soft)">Repetir:</span>
        {WEEKDAYS.map((w) => (
          <TooltipSimple key={w.v} content={`Repetir ${w.label}`} side="top">
            <button className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${(task.repeat || []).includes(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) text-(--muted) hover:border-(--accent)"}`} onClick={() => onRepeatToggle(w.v)} aria-label={`Repetir ${w.label}`}>{w.label}</button>
          </TooltipSimple>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-(--text-soft)">
          <Icon name="bell" size={16} />
          <span>Avisar</span>
          <div className="min-w-35">
            <Select value={form.remindBefore} onChange={(v) => setForm((p) => ({ ...p, remindBefore: v }))} options={REMIND_OPTIONS.map((o) => ({ value: String(o.v), label: o.label }))} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-(--text-soft)">
          <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ background: PRIO_META[form.priority].color }}>{PRIO_META[form.priority].mark}</span>
          <span>Prioridad</span>
          <div className="min-w-37.5">
            <Select
              value={form.priority}
              onChange={(v) => setForm((p) => ({ ...p, priority: v as Task["priority"] }))}
              options={Object.entries(PRIO_META).map(([v, m]) => ({ value: v, label: m.label, thumb: <span className="h-3 w-3 rounded-full shrink-0" style={{ background: m.color }} /> }))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-(--text-soft)">
          <Icon name="box" size={16} />
          <span>Mover a</span>
          <div className="min-w-40">
            <Select value={task.list} onChange={(v) => onMove(v)} options={store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} list="tag-options" placeholder="Etiquetas, separadas por coma…" className="flex-1 min-w-40" />
        <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}