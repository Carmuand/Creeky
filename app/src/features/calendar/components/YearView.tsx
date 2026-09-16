import type { Task } from "@/types/creeky";

interface YearViewProps {
  year: number;
  today: string;
  dayEvents: (iso: string) => Task[];
  onMonthClick: (month: number) => void;
}

/**
 * Year view with 12 mini-months.
 */
export function YearView({ year, today, dayEvents, onMonthClick }: YearViewProps) {
  return (
    <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const sd = (first.getDay() + 6) % 7;
        const nd = new Date(year, m + 1, 0).getDate();
        return (
          <button key={m} onClick={() => onMonthClick(m)} className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-2.5 text-left hover:border-(--border-dark) hover:shadow-sm transition-colors w-full">
            <b className="block text-xs capitalize mb-1.5">{new Date(year, m, 1).toLocaleDateString("es", { month: "long" })}</b>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: sd }).map((_, i) => <span key={`e-${i}`} />)}
              {Array.from({ length: nd }, (_, d) => {
                const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                const hasEv = dayEvents(iso).length > 0;
                const isToday = iso === today;
                return (
                  <span key={d} className={`flex aspect-square items-center justify-center rounded-full text-[11px] ${hasEv ? "bg-(--accent) font-bold text-white" : "text-(--muted)"} ${isToday ? "ring-1 ring-(--accent) ring-offset-1 font-bold text-(--text)" : ""}`}>
                    {d + 1}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
