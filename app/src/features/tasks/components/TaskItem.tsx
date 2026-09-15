import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META } from "@/types/creeky";
import { listColor } from "@/utils/task";
import { CreekyIcon } from "@/components/icons/CreekyIcon";
import { TaskDetail } from "./TaskDetail";

interface TaskItemProps {
  task: Task;
  store: CreekyDB;
  isOpen: boolean;
  focusId: string | null;
  isTrash: boolean;
  onToggle: () => void;
  onCheck: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermDelete: () => void;
  onCyclePrio: () => void;
  onFocus: () => void;
  onSaveDetail: (patch: Partial<Task>) => boolean;
  onRepeatToggle: (day: number) => void;
  onMove: (listId: string) => void;
}

export function TaskItem({ task: t, store, isOpen, focusId, isTrash, onToggle, onCheck, onDelete, onRestore, onPermDelete, onCyclePrio, onFocus, onSaveDetail, onRepeatToggle, onMove }: TaskItemProps) {
  const prio = t.priority || "none";

  return (
    <article className={`task-item ${t.done ? "done" : ""}`} style={{ borderLeft: `4px solid ${listColor(store, t.list)}` }}>
      <button className={`task-check ${t.done ? "done" : ""}`} onClick={onCheck} aria-label="Casilla completar">{t.done ? "✓" : ""}</button>

      <div className="task-body">
        <div className="task-title">{t.title}</div>
        <button className="task-desc-toggle" onClick={onToggle}>{t.description ? "Ver descripción" : "+ Añadir descripción"}</button>
        {isOpen ? <TaskDetail task={t} store={store} onSave={onSaveDetail} onRepeatToggle={onRepeatToggle} onMove={onMove} /> : null}

        <div className="task-meta">
          {t.due ? <a href="#calendar" className="tag">{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</a> : null}
          <span className="tag" style={{ display: (t.repeat || []).length ? "" : "none" }}>↻ <b>{(t.repeat || []).length}</b>d</span>
          {(t.remindBefore ?? 0) > 0 && t.due ? <span className="tag">aviso −{t.remindBefore}m</span> : null}
          {t.reminder ? <span className="tag">{String(t.reminder).slice(0, 16).replace("T", " ")}</span> : null}
          <button className="tag" onClick={onCyclePrio}><span className="prio-badge" style={{ ["--prio" as never]: PRIO_META[prio].color }}>{PRIO_META[prio].mark}</span> {PRIO_META[prio].label}</button>
          {(t.pomo || 0) > 0 ? <span className="tag">pomodoro ×{t.pomo}</span> : null}
          {(t.tags || []).map((x) => <span key={x} className="tag">#{x}</span>)}
        </div>
      </div>

      <div className="task-icons">
        <button className="icon-btn" onClick={onToggle} title="Programar"><CreekyIcon name="calendar" /></button>
        <button className={`icon-btn ${(t.reminder || t.dueTime) ? "on" : ""}`} onClick={onToggle} title="Recordatorio"><CreekyIcon name="bell" /></button>
        <button className={`icon-btn ${focusId === t.id ? "on" : ""}`} onClick={onFocus} title="Enfocar en Pomodoro"><CreekyIcon name="timer" /></button>
        <button className="icon-btn" onClick={onCyclePrio} title={`Prioridad ${PRIO_META[prio].label}`}><CreekyIcon name="flag" /></button>
        {isTrash ? (
          <>
            <button className="icon-btn" onClick={onRestore} title="Restaurar"><CreekyIcon name="restore" /></button>
            <button className="task-del" onClick={onPermDelete} title="Eliminar definitivo">✕</button>
          </>
        ) : (
          <button className="task-del" onClick={onDelete} aria-label="Eliminar">✕</button>
        )}
      </div>
    </article>
  );
}
