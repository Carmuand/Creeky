import { useState } from "react";
import type { Task } from "@/types/creeky";
import { listColor } from "@/utils/task";

import type { CreekyDB } from "@/types/creeky";

interface MonthViewProps {
  year: number;
  month: number;
  today: string;
  dayEvents: (iso: string) => Task[];
  store: CreekyDB;
}

/**
 * Month grid with slim event pills.
 */
export function MonthView({ year, month, today, dayEvents, store }: MonthViewProps) {
  const sd = (new Date(year, month, 1).getDay() + 6) % 7;
  const nd = new Date(year, month + 1, 0).getDate();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-(--border-light) bg-(--border-light)">
      {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
        <div key={d} className="bg-(--bg-tertiary) p-2.5 text-center text-xs font-semibold text-(--muted)">{d}</div>
      ))}
      {Array.from({ length: sd }).map((_, i) => <div key={`empty-${i}`} className="bg-(--bg-secondary) min-h-19.5" />)}
      {Array.from({ length: nd }, (_, idx) => {
        const d = idx + 1;
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const evs = dayEvents(iso);
        const isToday = iso === today;
        const isExpanded = expanded === iso;
        return (
          <div key={iso} className={`bg-(--bg-primary) p-1.5 min-h-19.5 overflow-hidden ${isToday ? "ring-2 ring-inset ring-(--accent)" : ""}`}>
            <div className="mb-1 text-xs font-semibold">{d}</div>
            {evs.slice(0, 2).map((e) => (
              <div key={e.id} className="mb-1 flex items-center gap-1 rounded-md border-l-[3px] bg-(--accent-light) px-1 py-0.5 text-[11px] truncate" style={{ borderLeftColor: listColor(store, e.list) }} title={`${e.title}${e.dueTime ? ` ${e.dueTime}` : ""}`}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: listColor(store, e.list) }} />
                {e.dueTime ? <b className="text-[11px]">{e.dueTime}</b> : null}
                <span className="truncate">{e.title.slice(0, 12)}{(e.repeat || []).length ? " ↻" : ""}</span>
              </div>
            ))}
            {evs.length > 2 ? (
              <>
                <button className="text-[11px] text-(--muted) hover:text-(--accent) hover:underline" onClick={() => setExpanded(isExpanded ? null : iso)}>
                  {isExpanded ? "− menos" : `+${evs.length - 2} más`}
                </button>
                {isExpanded ? <div className="mt-1 flex flex-col gap-0.5">{evs.slice(2).map((e) => (
                  <div key={e.id} className="flex items-center gap-1 rounded-md border-l-[3px] bg-(--accent-light) px-1 py-0.5 text-[11px] truncate" style={{ borderLeftColor: listColor(store, e.list) }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: listColor(store, e.list) }} />{e.dueTime ? <b>{e.dueTime}</b> : null}<span className="truncate">{e.title.slice(0, 12)}</span></div>
                ))}</div> : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
