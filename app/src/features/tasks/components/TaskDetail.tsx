import { useEffect, useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
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
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)">Duración <select className="form-select" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}>
          {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
        </select></label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-(--text-soft)">Repetir:</span>
        {WEEKDAYS.map((w) => (
          <button key={w.v} className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${(task.repeat || []).includes(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) text-(--muted) hover:border-(--accent)"}`} onClick={() => onRepeatToggle(w.v)} title={`Repetir ${w.label}`}>{w.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)"><Icon name="bell" size={16} /> Avisar <select className="form-select" value={form.remindBefore} onChange={(e) => setForm((p) => ({ ...p, remindBefore: e.target.value }))}>
          {REMIND_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select></label>
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)"><span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[form.priority].color }}>{PRIO_META[form.priority].mark}</span> Prioridad <select className="form-select" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}>
          {Object.entries(PRIO_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select></label>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-(--text-soft)"><Icon name="box" size={16} /> Mover a <select className="form-select" value={task.list} onChange={(e) => onMove(e.target.value)}>
          {store.lists.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select></label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} list="tag-options" placeholder="Etiquetas, separadas por coma…" className="flex-1 min-w-40" />
        <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}

