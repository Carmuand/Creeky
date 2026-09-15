import type { Task, CreekyDB } from "@/types/creeky";
import { listColor } from "@/utils/task";
import { PRIO_META } from "@/types/creeky";

interface DayViewProps {
  iso: string;
  dayEvents: (iso: string) => Task[];
  store: CreekyDB;
}

/**
 * Single day view grouped by hour.
 */
export function DayView({ iso, dayEvents, store }: DayViewProps) {
  const evs = dayEvents(iso);
  const allDay = evs.filter((e) => !e.dueTime);
  const byHour: Record<string, Task[]> = {};
  evs.filter((e) => e.dueTime).forEach((e) => { const h = e.dueTime.slice(0, 2); (byHour[h] ||= []).push(e); });

  const renderItem = (e: Task) => {
    const c = listColor(store, e.list);
    const li = store.lists.find((l) => l.id === e.list);
    return (
      <div key={e.id} className="flex items-center gap-2 rounded-lg border bg-(--bg-secondary) px-3 py-2 text-sm" style={{ borderLeft: `4px solid ${c}` }}>
        <span className="text-xs text-(--muted)">{e.dueTime || "Todo el día"}</span>
        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[e.priority || "none"].color }}>{PRIO_META[e.priority || "none"].mark}</span>
        <span className="font-medium">{e.title}</span>
        <span className="ml-auto rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 text-xs">{li ? `${li.icon} ${li.name}` : e.list}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-3 rounded-lg border border-(--border-light) bg-(--bg-primary) p-3">
        <b className="min-w-20 text-xs text-(--muted)">Todo el día</b>
        <div className="flex flex-1 flex-col gap-1.5">{allDay.length ? allDay.map(renderItem) : <span className="text-xs text-(--muted)">—</span>}</div>
      </div>
      {Object.keys(byHour).sort().map((h) => (
        <div key={h} className="flex gap-3 rounded-lg border border-(--border-light) bg-(--bg-primary) p-3">
          <b className="min-w-20 text-xs text-(--muted)">{h}:00</b>
          <div className="flex flex-1 flex-col gap-1.5">{byHour[h].map(renderItem)}</div>
        </div>
      ))}
      {!evs.length ? <p className="py-4 text-center text-sm text-(--muted)">Sin tareas este día</p> : null}
    </div>
  );
}
