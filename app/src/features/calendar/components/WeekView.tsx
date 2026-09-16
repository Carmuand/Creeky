import type { Task, CreekyDB } from "@/types/creeky";
import { listColor } from "@/utils/task";

interface WeekViewProps {
  isos: string[];
  today: string;
  dayEvents: (iso: string) => Task[];
  store: CreekyDB;
}

const WD_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Week / multi-day grid.
 */
export function WeekView({ isos, today, dayEvents, store }: WeekViewProps) {
  return (
    <div className={`grid gap-2 ${isos.length === 3 ? "grid-cols-3 max-[900px]:grid-cols-1" : "grid-cols-7 max-[900px]:grid-cols-2"}`}>
      {isos.map((iso) => {
        const dt = new Date(...iso.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]);
        const evs = dayEvents(iso);
        const isToday = iso === today;
        return (
          <div key={iso} className={`flex min-h-35 flex-col overflow-hidden rounded-xl border bg-(--bg-primary) ${isToday ? "ring-2 ring-(--accent)" : "border-(--border-light)"}`}>
            <header className="flex items-center justify-between gap-1.5 border-b border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-xs">
              <b>{WD_SHORT[(dt.getDay() + 6) % 7]}</b><span>{dt.getDate()}</span>
            </header>
            <div className="flex flex-col gap-1 p-2">
              {evs.length ? evs.map((e) => (
                <div key={e.id} className="truncate rounded-md border-l-[3px] bg-(--accent-light) px-1.5 py-1 text-xs" style={{ borderLeftColor: listColor(store, e.list) }} title={e.title}>
                  {e.dueTime ? <b>{e.dueTime} </b> : null}{e.title.slice(0, 20)}{(e.repeat || []).length ? " ↻" : ""}
                </div>
              )) : <p className="py-2 text-center text-xs text-(--muted)">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
