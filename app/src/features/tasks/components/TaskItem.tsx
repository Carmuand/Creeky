import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META } from "@/types/creeky";
import { listColor } from "@/utils/task";
import { Icon } from "@/components/icons/Icon";
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
    <article
      className={`flex gap-3 items-start p-3 border rounded-lg bg-(--bg-primary) transition-all ${t.done ? "opacity-65" : "hover:border-(--border-dark) hover:shadow-sm"} border-(--border-light)`}
      style={{ borderLeft: `4px solid ${listColor(store, t.list)}` }}
    >
      <button
        className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 text-sm ${t.done ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-dark) text-transparent"}`}
        onClick={onCheck}
        aria-label="Casilla completar"
      >
        {t.done ? "✓" : ""}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-[15px] ${t.done ? "line-through opacity-70" : ""}`}>{t.title}</div>
        <button className="text-xs text-(--muted) underline hover:text-(--accent) mt-1" onClick={onToggle}>
          {t.description ? "Ver descripción" : "+ Añadir descripción"}
        </button>
        {isOpen ? <TaskDetail task={t} store={store} onSave={onSaveDetail} onRepeatToggle={onRepeatToggle} onMove={onMove} /> : null}

        <div className="flex flex-wrap gap-2 mt-2 text-xs text-(--muted)">
          {t.due ? <a href="#calendar" className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</a> : null}
          {(t.repeat || []).length ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">↻ <b>{(t.repeat || []).length}</b>d</span> : null}
          {(t.remindBefore ?? 0) > 0 && t.due ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">aviso −{t.remindBefore}m</span> : null}
          {t.reminder ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">{String(t.reminder).slice(0, 16).replace("T", " ")}</span> : null}
          <button className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 flex items-center gap-1" onClick={onCyclePrio}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[prio].color }}>{PRIO_META[prio].mark}</span> {PRIO_META[prio].label}
          </button>
          {(t.pomo || 0) > 0 ? <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">pomodoro ×{t.pomo}</span> : null}
          {(t.tags || []).map((x) => <span key={x} className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">#{x}</span>)}
        </div>
      </div>

      <div className="flex gap-0.5 items-center shrink-0">
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={onToggle} title="Programar"><Icon name="calendar" size={16} /></button>
        <button className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-(--bg-hover) ${(t.reminder || t.dueTime) ? "text-(--accent) bg-(--accent-light)" : "text-(--muted) hover:text-(--text)"}`} onClick={onToggle} title="Recordatorio"><Icon name="bell" size={16} /></button>
        <button className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-(--bg-hover) ${focusId === t.id ? "text-(--accent) bg-(--accent-light)" : "text-(--muted) hover:text-(--text)"}`} onClick={onFocus} title="Enfocar en Pomodoro"><Icon name="timer" size={16} /></button>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={onCyclePrio} title={`Prioridad ${PRIO_META[prio].label}`}><Icon name="flag" size={16} /></button>
        {isTrash ? (
          <>
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)" onClick={onRestore} title="Restaurar"><Icon name="restore" size={16} /></button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-[#C62828]" onClick={onPermDelete} title="Eliminar definitivo">✕</button>
          </>
        ) : (
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-[#C62828]" onClick={onDelete} aria-label="Eliminar">✕</button>
        )}
      </div>
    </article>
  );
}

