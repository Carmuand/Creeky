import { useEffect, useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS } from "@/types/creeky";
import { CreekyIcon } from "@/components/icons/CreekyIcon";
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
    <div className="task-detail">
      <textarea className="form-textarea" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descripción…" />

      <div className="preset-row" role="group" aria-label="Fecha rápida">
        <button className="chip" onClick={() => setForm((p) => ({ ...p, due: todayISO() }))}>Hoy</button>
        <button className="chip" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 1) }))}>Mañana</button>
        <button className="chip" onClick={() => setForm((p) => ({ ...p, due: addDaysISO(todayISO(), 7) }))}>Esta semana</button>
        <button className="chip" onClick={() => setForm((p) => ({ ...p, due: "" }))}>Sin fecha</button>
      </div>

      <div className="task-detail-row">
        <label><CreekyIcon name="calendar" size={16} /> <input type="date" className="form-input" value={form.due} onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))} /></label>
        <label><CreekyIcon name="clock" size={16} /> <input type="time" className="form-input" value={form.dueTime} onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))} /></label>
        <label>Duración <select className="form-select" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}>
          {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
        </select></label>
      </div>

      <div className="repeat-row">
        <span className="repeat-label">Repetir:</span>
        {WEEKDAYS.map((w) => (
          <button key={w.v} className={`day-chip ${form.tags ? "" : ""} ${(task.repeat || []).includes(w.v) ? "on" : ""}`} onClick={() => onRepeatToggle(w.v)} title={`Repetir ${w.label}`}>{w.label}</button>
        ))}
      </div>

      <div className="task-detail-row">
        <label><CreekyIcon name="bell" size={16} /> Avisar <select className="form-select" value={form.remindBefore} onChange={(e) => setForm((p) => ({ ...p, remindBefore: e.target.value }))}>
          {REMIND_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select></label>
        <label><span className="prio-badge" style={{ ["--prio" as never]: PRIO_META[form.priority].color }}>{PRIO_META[form.priority].mark}</span> Prioridad <select className="form-select" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}>
          {Object.entries(PRIO_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select></label>
      </div>

      <div className="task-detail-row">
        <label><CreekyIcon name="box" size={16} /> Mover a <select className="form-select" value={task.list} onChange={(e) => onMove(e.target.value)}>
          {store.lists.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select></label>
      </div>

      <div className="task-detail-row">
        <input className="form-input" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} list="tag-options" placeholder="Etiquetas, separadas por coma…" />
        <button className="btn btn-primary btn-sm" onClick={handleSave}>Guardar</button>
      </div>
    </div>
  );
}
