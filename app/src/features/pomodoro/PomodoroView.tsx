import { useEffect, useMemo, useRef, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useCreekyFocus } from "@/hooks/useCreekyFocus";
import { usePomodoroTimer } from "./hooks/usePomodoroTimer";
import { todayISO } from "@/utils/date";
import { occursOn, listColor } from "@/utils/task";
import { db, uid } from "@/services/storage";
import { Button } from "@/components/ui/Button";

export function PomodoroView() {
  const { store, refresh } = useCreekyStore();
  const { focus, setFocus, clear } = useCreekyFocus();
  const { left, mode, running, setMode, start, reset } = usePomodoroTimer();
  const [historyRange, setHistoryRange] = useState<"all" | "today" | "week">("all");
  const [historyMode, setHistoryMode] = useState<"all" | "focus" | "break">("all");
  const [pomoTab, setPomoTab] = useState<"today" | "all">("today");

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const focusTask = useMemo(() => (focus?.id ? store.tasks.find((t) => t.id === focus.id) : null), [focus, store.tasks]);
  const focusList = useMemo(() => (focusTask ? store.lists.find((l) => l.id === focusTask.list) : null), [focusTask, store.lists]);

  const todayCount = useMemo(() => store.pomoLog.filter((p) => p.date === todayISO() && p.mode === "focus").length, [store.pomoLog]);
  const totalMin = useMemo(() => store.pomoLog.filter((p) => p.mode === "focus").reduce((a, p) => a + (p.minutes || 0), 0), [store.pomoLog]);

  const pomoTasks = useMemo(() => store.tasks.filter((t) => !t.deleted && !t.done && Array.isArray(t.pomodoroBlocks) && t.pomodoroBlocks.length > 0), [store.tasks]);
  const pomoToday = useMemo(() => pomoTasks.filter((t) => !t.due || t.due === todayISO() || occursOn(t, todayISO())), [pomoTasks]);

  const prevLeft = useRef(left);
  useEffect(() => {
    const justCompleted = prevLeft.current === 1 && left === 0 && !running;
    prevLeft.current = left;
    if (!justCompleted) return;
    const isFocus = mode === 25;
    const s = db.load();
    const taskTitle = focus?.title ?? null;
    s.pomoLog.unshift({ id: uid("p"), date: todayISO(), ts: Date.now(), mode: isFocus ? "focus" : "break", minutes: mode, task: taskTitle });
    if (isFocus && focus?.id) {
      const t = s.tasks.find((x) => x.id === focus.id && !x.deleted);
      if (t) {
        t.pomo = (t.pomo || 0) + 1;
        s.notifications.unshift({ id: uid("n"), title: "Sesión dedicada", text: `"${t.title}" suma ${t.pomo} sesión(es) Pomodoro.`, time: new Date().toLocaleString(), unread: true, kind: "system" });
      }
    }
    db.save(s);
    refresh();
    try { new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play().catch(() => {}); } catch { /* ignore */ }
  }, [left, running, mode, focus, refresh]);

  const handleFocusDone = () => {
    if (focusTask && !focusTask.done) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === focusTask.id);
      if (t) t.done = true;
      db.save(s);
      refresh();
    }
    clear();
  };

  const filteredLog = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return store.pomoLog.slice(0, 30).filter((p) => {
      const rangeOk = historyRange === "all" ? true : historyRange === "today" ? p.date === todayISO() : new Date(p.date) >= weekAgo;
      const modeOk = historyMode === "all" ? true : p.mode === historyMode;
      return rangeOk && modeOk;
    });
  }, [store.pomoLog, historyRange, historyMode]);

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Pomodoro">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">Técnica 25 / 5 • anillo progresivo</p>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-8 text-center shadow-sm">
        <div className="mb-2 flex justify-center gap-2">
          {[25, 5, 15].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${mode === m ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"}`}>
              {m === 25 ? "Foco 25" : m === 5 ? "Descanso 5" : "Largo 15"}
            </button>
          ))}
        </div>

        {(() => {
          const pct = left / (mode * 60 || 1);
          const r = 120;
          const c = 2 * Math.PI * r;
          const offset = c * (1 - pct);
          return (
            <div className="relative mx-auto mb-5 flex h-65 w-65 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 260 260" aria-hidden="true">
                <circle cx="130" cy="130" r={r} fill="none" stroke="var(--border-light)" strokeWidth="10" />
                <circle cx="130" cy="130" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }} />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <div className="text-5xl font-bold tracking-tight tabular-nums">{fmt(left)}</div>
                <div className="text-sm text-(--muted)">{running ? "Enfocando…" : left === 0 ? "¡Sesión completa!" : "Listo para enfocar"}</div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="lg" onClick={start}>{running ? "Pausar" : left === 0 || left === mode * 60 ? "Iniciar" : "Continuar"}</Button>
          <Button variant="secondary" onClick={reset}>Reiniciar</Button>
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs text-(--muted)">
          <span>Foco hoy: <b className="text-(--text)">{todayCount}</b></span><span>•</span><span>Minutos totales: <b className="text-(--text)">{totalMin}</b></span>
        </div>
      </div>

      {focus ? (
        <div className="flex gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 shadow-sm" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div className="flex-1 min-w-0">
            <b className="block truncate text-sm font-semibold">Enfocando: {focusTask?.title ?? focus.title}</b>
            {focusTask ? (
              <span className="text-xs text-(--muted)">{focusList ? `${focusList.icon} ${focusList.name} • ` : ""}{focusTask.due ? `vence ${focusTask.due}${focusTask.dueTime ? ` ${focusTask.dueTime}` : ""} • ` : ""}{focusTask.duration || 30} min • sesiones dedicadas: {focusTask.pomo || 0}</span>
            ) : (
              <span className="text-xs text-(--muted)">La tarea ya no existe</span>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            {focusTask && !focusTask.done ? <Button variant="primary" size="sm" onClick={handleFocusDone}>Completar tarea</Button> : null}
            <Button variant="secondary" size="sm" onClick={clear}>Quitar</Button>
          </div>
        </div>
      ) : null}

      <h3 className="mt-2 text-sm font-semibold">Historial de sesiones</h3>
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Ver:</span>
          {(["all", "today", "week"] as const).map((v) => (
            <button key={v} onClick={() => setHistoryRange(v)} className={`rounded-full border px-3 py-1 text-xs ${historyRange === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{v === "all" ? "Todo" : v === "today" ? "Hoy" : "7 días"}</button>
          ))}
          <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-(--muted)">Tipo:</span>
          {(["all", "focus", "break"] as const).map((v) => (
            <button key={v} onClick={() => setHistoryMode(v)} className={`rounded-full border px-3 py-1 text-xs ${historyMode === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{v === "all" ? "Todos" : v === "focus" ? "Foco" : "Descanso"}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {filteredLog.length ? filteredLog.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-3 py-2">
              <span className={`h-3 w-3 shrink-0 rounded-full ${p.mode === "focus" ? "bg-(--accent)" : "bg-(--muted)"}`} />
              <div><b className="text-sm">{p.minutes} min — {p.mode === "focus" ? "Foco" : "Descanso"}</b><div className="text-xs text-(--muted)">{p.date}{p.task ? ` • ${p.task}` : ""}</div></div>
            </div>
          )) : <p className="py-2 text-sm text-(--muted)">Sin sesiones aún. Completa tu primer pomodoro.</p>}
        </div>
      </div>

      {pomoTasks.length > 0 ? (
        <>
          <h3 className="mt-2 text-sm font-semibold">Sesiones Pomodoro del día <span className="text-xs font-normal text-(--muted)">({pomoToday.length} hoy • {pomoTasks.length} total)</span></h3>
          <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
            <div className="mb-3 flex gap-2">
              <button onClick={() => setPomoTab("today")} className={`rounded-full border px-3 py-1 text-xs ${pomoTab === "today" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) text-(--muted)"}`}>Hoy ({pomoToday.length})</button>
              <button onClick={() => setPomoTab("all")} className={`rounded-full border px-3 py-1 text-xs ${pomoTab === "all" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) text-(--muted)"}`}>Todas ({pomoTasks.length})</button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-2.5">
              {(pomoTab === "today" ? pomoToday : pomoTasks).map((t) => {
                const li = store.lists.find((l) => l.id === t.list);
                const blocks = t.pomodoroBlocks || [];
                const f = blocks.filter((b) => b.type === "focus").length;
                const mins = blocks.reduce((a, b) => a + b.duration, 0);
                const isFocused = focus?.id === t.id;
                return (
                  <div key={t.id} className={`relative flex items-center gap-2.5 rounded-xl border bg-(--bg-primary) p-3 overflow-hidden ${isFocused ? "border-(--accent) bg-(--accent-light)" : "border-(--border-light)"}`}>
                    <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: listColor(store, t.list) }} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold">{t.title}</div>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-(--muted)">{li ? <span className="truncate">{li.icon} {li.name} •</span> : null}<span>{f}×25 • {mins}′</span>{t.dueTime ? <><span>•</span><span>{t.dueTime}</span></> : null}</div>
                      <div className="mt-1 flex gap-1">{blocks.map((b, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${b.type === "focus" ? "bg-(--accent)" : b.type === "longBreak" ? "bg-(--muted)" : "bg-(--border-medium)"}`} />)}</div>
                    </div>
                    {!isFocused ? <button onClick={() => setFocus({ id: t.id, title: t.title })} className="shrink-0 rounded-full border border-(--border-medium) bg-(--bg-primary) px-2.5 py-1 text-xs font-medium hover:bg-(--accent) hover:text-white hover:border-(--accent)">Enfocar</button> : <span className="shrink-0 rounded-full bg-(--accent) px-2.5 py-1 text-xs font-bold text-white">Enfocada</span>}
                  </div>
                );
              })}
              {(pomoTab === "today" ? pomoToday : pomoTasks).length === 0 ? <p className="col-span-full py-4 text-center text-sm text-(--muted)">No hay tareas con Pomodoro para hoy.</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}