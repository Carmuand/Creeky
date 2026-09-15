import type { Task, CreekyDB } from "@/types/creeky";
import { listColor } from "@/utils/task";
import { PRIO_META } from "@/types/creeky";

interface AgendaProps {
  today: string;
  dayEvents: (iso: string) => Task[];
  store: CreekyDB;
}

/**
 * Agenda for the next 7 days.
 */
export function Agenda({ today, dayEvents, store }: AgendaProps) {
  const items: { iso: string; label: string; evs: Task[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = (() => { const [y, m, d] = today.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + i); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; })();
    const evs = dayEvents(iso);
    if (!evs.length && i > 0) continue;
    items.push({ iso, label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : iso, evs });
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(({ label, evs }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <b className="text-sm">{label}</b>
          {evs.length ? evs.map((e) => {
            const c = listColor(store, e.list);
            const li = store.lists.find((l) => l.id === e.list);
            return (
              <div key={e.id} className="flex items-center gap-2 rounded-lg border bg-(--bg-secondary) px-3 py-2 text-sm" style={{ borderLeft: `4px solid ${c}` }}>
                <span className="text-xs text-(--muted)">{e.dueTime || "Todo el día"}</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: PRIO_META[e.priority || "none"].color }}>{PRIO_META[e.priority || "none"].mark}</span>
                <span>{e.title}</span>
                <span className="ml-auto rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 text-xs">{li ? `${li.icon} ${li.name}` : e.list}</span>
              </div>
            );
          }) : <span className="text-xs text-(--muted)">Sin tareas — agenda libre</span>}
        </div>
      ))}
    </div>
  );
}
