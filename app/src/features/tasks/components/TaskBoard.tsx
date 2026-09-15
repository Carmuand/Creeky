import type { CreekyDB, Task } from "@/types/creeky";
import { PRIO_META } from "@/types/creeky";
import { listColor } from "@/utils/task";

interface TaskBoardProps {
  columns: { id: string; name: string; color: string; icon: string; description: string }[];
  tasks: Task[];
  store: CreekyDB;
  onDrop: (e: React.DragEvent, zone: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onCheck: (id: string) => void;
}

export function TaskBoard({ columns, tasks, store, onDrop, onDragStart, onCheck }: TaskBoardProps) {
  return (
    <>
      <div className="board">
        {columns.map((l) => {
          const cards = tasks.filter((t) => t.list === l.id || (l.id === "__trash" && t.deleted));
          return (
            <div
              key={l.id}
              className="board-col"
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("drop-hint"); }}
              onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("drop-hint")}
              onDrop={(e) => { (e.currentTarget as HTMLElement).classList.remove("drop-hint"); onDrop(e, l.id); }}
            >
              <header style={{ borderTop: `4px solid ${l.color}` }}><b>{l.icon ? `${l.icon} ` : ""}{l.name}</b><span className="list-count">{cards.length}</span></header>
              <div className="board-cards">
                {cards.map((t) => (
                  <div key={t.id} className={`board-card ${t.done ? "done" : ""}`} draggable onDragStart={(e) => onDragStart(e, t.id)} style={{ borderLeft: `4px solid ${listColor(store, t.list)}` }}>
                    <button className={`task-check ${t.done ? "done" : ""}`} onClick={() => onCheck(t.id)}>{t.done ? "✓" : ""}</button>
                    <div className="task-body">
                      <div className="task-title">{t.title}</div>
                      <div className="task-meta">
                        {t.due ? <span>{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</span> : null}
                        <span className="prio-badge" style={{ ["--prio" as never]: PRIO_META[t.priority || "none"].color }}>{PRIO_META[t.priority || "none"].mark}</span>
                        {(t.repeat || []).length ? <span>↻</span> : null}
                        {(t.tags || []).slice(0, 2).map((x) => <span key={x}>#{x}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
                {!cards.length ? <p className="board-empty">Arrastra tareas aquí</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs board-hint">Arrastra una tarjeta a otra columna para cambiarla de lista. En táctil usa el detalle y la opción Mover a.</p>
    </>
  );
}
