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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3 p-4 items-start">
        {columns.map((l) => {
          const cards = tasks.filter((t) => t.list === l.id || (l.id === "__trash" && t.deleted));
          return (
            <div
              key={l.id}
              className="flex min-h-45 flex-col rounded-xl border border-(--border-light) bg-(--bg-secondary) transition-all"
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("ring-2", "ring-(--accent)", "ring-dashed"); }}
              onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("ring-2", "ring-(--accent)", "ring-dashed")}
              onDrop={(e) => { (e.currentTarget as HTMLElement).classList.remove("ring-2", "ring-(--accent)", "ring-dashed"); onDrop(e, l.id); }}
            >
              <header className="flex items-center justify-between gap-2 rounded-t-xl border-b border-(--border-light) bg-(--bg-primary) px-3 py-2.5 text-sm" style={{ borderTop: `4px solid ${l.color}` }}><b className="truncate">{l.icon ? `${l.icon} ` : ""}{l.name}</b><span className="shrink-0 rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{cards.length}</span></header>
              <div className="flex flex-col gap-2 p-2.5">
                {cards.map((t) => (
                  <div key={t.id} className={`flex gap-2 rounded-lg border bg-(--bg-primary) p-2.5 cursor-grab active:cursor-grabbing active:opacity-80 ${t.done ? "opacity-60" : ""}`} draggable onDragStart={(e) => onDragStart(e, t.id)} style={{ borderLeft: `4px solid ${listColor(store, t.list)}`, borderColor: "var(--border-light)" }}>
                    <button className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${t.done ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-dark)"}`} onClick={() => onCheck(t.id)}>{t.done ? "✓" : ""}</button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${t.done ? "line-through" : ""}`}>{t.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-(--muted)">
                        {t.due ? <span>{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</span> : null}
                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[t.priority || "none"].color }}>{PRIO_META[t.priority || "none"].mark}</span>
                        {(t.repeat || []).length ? <span>↻</span> : null}
                        {(t.tags || []).slice(0, 2).map((x) => <span key={x}>#{x}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
                {!cards.length ? <p className="rounded-lg border border-dashed border-(--border-medium) px-3 py-4 text-center text-xs text-(--muted)">Arrastra tareas aquí</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-4 pb-3 text-xs text-(--muted)">Arrastra una tarjeta a otra columna para cambiarla de lista.</p>
    </>
  );
}
