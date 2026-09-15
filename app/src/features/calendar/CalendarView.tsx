import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useCalendarView } from "./hooks/useCalendarView";
import { YearView } from "./components/YearView";
import { MonthView } from "./components/MonthView";
import { WeekView } from "./components/WeekView";
import { DayView } from "./components/DayView";
import { Agenda } from "./components/Agenda";
import { todayISO, addDaysISO, isoWeekKey, mondayOfWeekKey } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/components/icons/Icon";

const CAL_MODES = [
  ["year", "Año"],
  ["month", "Mes"],
  ["week", "Semana"],
  ["day", "Día"],
  ["mdays", "3 días"],
  ["mweeks", "2 sem."],
] as const;

/**
 * Calendar feature with year/month/week/day views.
 */
export function CalendarView() {
  const { store } = useCreekyStore();
  const { view, setView, setMode, navigate, setList, setOnlyTime, reset } = useCalendarView();
  const today = todayISO();

  const inFilter = (t: { list: string; dueTime: string }) => (view.list === "all" || t.list === view.list) && (!view.onlyTime || !!t.dueTime);
  const dayEvents = (iso: string) => store.tasks.filter((t) => !t.deleted && !t.done && occursOn(t, iso) && inFilter(t as never)).sort((a, b) => (a.dueTime || "99") < (b.dueTime || "99") ? -1 : 1);

  let title = "";
  let body: React.ReactNode = null;

  if (view.mode === "year") {
    const yy = new Date().getFullYear() + view.offset;
    title = `${yy}`;
    body = <YearView year={yy} today={today} dayEvents={dayEvents} onMonthClick={(m) => { const now = new Date(); const off = (yy - now.getFullYear()) * 12 + (m - now.getMonth()); setView({ offset: off, mode: "month", list: view.list, onlyTime: view.onlyTime }); }} />;
  } else if (view.mode === "month") {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + view.offset);
    const y = base.getFullYear(), m = base.getMonth();
    title = new Date(y, m, 1).toLocaleDateString("es", { month: "long", year: "numeric" });
    body = <MonthView year={y} month={m} today={today} dayEvents={dayEvents} store={store} />;
  } else {
    const weekMon = addDaysISO(mondayOfWeekKey(isoWeekKey(new Date())), 0);
    let isos: string[] = [];
    if (view.mode === "week") isos = Array.from({ length: 7 }, (_, i) => addDaysISO(weekMon, view.offset * 7 + i));
    else if (view.mode === "day") isos = [addDaysISO(today, view.offset)];
    else if (view.mode === "mdays") { const st = addDaysISO(today, view.offset * 3); isos = [st, addDaysISO(st, 1), addDaysISO(st, 2)]; }
    else { const st = addDaysISO(weekMon, view.offset * 14); isos = Array.from({ length: 14 }, (_, i) => addDaysISO(st, i)); }

    if (view.mode === "day") {
      title = new Date(...isos[0].split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
      body = <DayView iso={isos[0]} dayEvents={dayEvents} store={store} />;
    } else {
      const fmtD = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }); };
      title = `${fmtD(isos[0])} — ${fmtD(isos[isos.length - 1])}`;
      body = <WeekView isos={isos} today={today} dayEvents={dayEvents} store={store} />;
    }
  }

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Calendario">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-(--muted)"><span className="text-[22px] font-bold capitalize text-(--text)">{title}</span><br /><span className="text-xs text-(--muted)">Cada lista pinta con su color • ↻ = repetitiva</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>←</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(0)}>Hoy</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(1)}>→</Button>
          <a href="#tasks" className="inline-flex items-center justify-center rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium hover:bg-(--bg-hover)">+ Programar</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-(--bg-tertiary) p-1 w-fit">
        {CAL_MODES.map(([v, l]) => (
          <button key={v} onClick={() => setMode(v as never)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${view.mode === v ? "bg-(--bg-primary) text-(--text) shadow-sm" : "text-(--muted) hover:text-(--text)"}`}>{l}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--border-light) bg-(--bg-primary) px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Ver:</span>
        <div className="min-w-45">
          <Select value={view.list} onChange={setList} options={[{ value: "all", label: "Todas las listas" }, ...store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))]} />
        </div>
        <Checkbox checked={view.onlyTime} onChange={setOnlyTime} label="Solo con hora" />
        <button onClick={reset} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent)"><Icon name="xcirc" size={13} /> Limpiar</button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-(--muted)">
        {store.lists.map((l) => <span key={l.id} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: l.color }} />{l.icon}{l.name}</span>)}
      </div>

      {body}

      <h3 className="mt-2 text-sm font-semibold">Agenda — próximos 7 días</h3>
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4">
        <Agenda today={today} dayEvents={dayEvents} store={store} />
      </div>
    </section>
  );
}
