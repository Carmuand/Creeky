import { useEffect, useMemo, useRef, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useCreekyFocus } from "@/hooks/useCreekyFocus";
import { usePomodoroTimer } from "./hooks/usePomodoroTimer";
import { todayISO } from "@/utils/date";
import { occursOn, listColor } from "@/utils/task";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { notificationsApi, pomodoroApi, tasksApi } from "@/services/api";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Task } from "@/types/creeky";

/**
 * Pomodoro view with the timer, the focused task, the session history and
 * the tasks that reserved Pomodoro blocks.
 *
 * @returns The Pomodoro view.
 */
export function PomodoroView() {
  const { store } = useCreekyStore();
  const { t: tr } = useI18n();

  const report = (error: unknown) => pushToast(errorMessage(error), "error");
  const { focus, setFocus, clear } = useCreekyFocus();
  const { left, mode, running, setMode, start, reset } = usePomodoroTimer();
  const [historyRange, setHistoryRange] = useState<"all" | "today" | "week">("all");
  const [historyMode, setHistoryMode] = useState<"all" | "focus" | "break">("all");
  const [pomoTab, setPomoTab] = useState<"today" | "all">("today");

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const focusTask = useMemo(() => (focus?.id ? store.tasks.find((t) => t.id === focus.id) : null), [focus, store.tasks]);
  const focusList = useMemo(() => (focusTask ? store.lists.find((l) => l.id === focusTask.list) : null), [focusTask, store.lists]);

  const requiredSessions = useMemo(() => (focusTask?.pomodoroBlocks || []).filter((b) => b.type === "focus").length, [focusTask]);
  const completedSessions = focusTask?.pomo ?? 0;
  const isCompletable = requiredSessions === 0 ? true : completedSessions >= requiredSessions;

  const handleStartSession = (task: Task) => {
    if (focus?.id !== task.id) setFocus({ id: task.id, title: task.title });
    if (mode !== 25) setMode(25);
    if (!running) start();
  };

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
    pomodoroApi
      .logSession(isFocus ? "focus" : "break", mode, focus?.id || null, focus?.title ?? null)
      .then((result) => {
        if (!result.task) return undefined;
        return notificationsApi.create([{ title: tr("notif.pomodoro.session"), text: tr("notif.pomodoro.sessionText", { title: result.task.title, count: result.task.pomo }), kind: "system" }]);
      })
      .catch(report);
    void new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play().catch(() => undefined);
  }, [left, running, mode, focus]);

  const handleFocusDone = () => {
    if (!focusTask || focusTask.done) return;
    if (!isCompletable) {
      pushToast(tr("pomodoro.toast.missing", { count: requiredSessions - completedSessions }), "warning");
      return;
    }
    tasksApi.update(focusTask.id, { done: true }).then(() => clear()).catch(report);
  };

  const filteredLog = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return store.pomoLog.slice(0, 30).filter((p) => {
      const rangeOk = historyRange === "all" ? true : historyRange === "today" ? p.date === todayISO() : new Date(p.date) >= weekAgo;
      const modeOk = historyMode === "all" ? true : p.mode === historyMode;
      return rangeOk && modeOk;
    });
  }, [store.pomoLog, historyRange, historyMode]);

  const handleDeleteLog = (id: string) => {
    pomodoroApi.removeSession(id).catch(report);
  };

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={tr("nav.pomodoro")}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">{tr("pomodoro.intro")}</p>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-8 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="mb-2 flex justify-center gap-2">
          {[25, 5, 15].map((m) => {
            const isFocoRunning = running && mode === 25;
            const isPausedFoco = !running && mode === 25 && left > 0 && left < 25 * 60;
            const disabled = (m !== 25 && (isFocoRunning || isPausedFoco)) || (running && mode !== m);
            return (
              <button key={m} onClick={() => !disabled && setMode(m)} disabled={disabled} className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${mode === m ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"} ${disabled ? "opacity-40 cursor-not-allowed hover:border-(--border-medium) hover:text-(--muted)" : ""}`}>
                {m === 25 ? tr("pomodoro.mode.focus") : m === 5 ? tr("pomodoro.mode.short") : tr("pomodoro.mode.long")}
              </button>
            );
          })}
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
                <div className="text-sm text-(--muted)">{running ? tr("pomodoro.status.running") : left === 0 ? tr("pomodoro.status.done") : tr("pomodoro.status.ready")}</div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="lg" onClick={start}>{running ? tr("pomodoro.pause") : left === 0 || left === mode * 60 ? tr("pomodoro.start") : tr("pomodoro.resume")}</Button>
          <Button variant="secondary" onClick={reset}>{tr("pomodoro.reset")}</Button>
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs text-(--muted)">
          <span>{tr("pomodoro.stats.today")} <b className="text-(--text)">{todayCount}</b></span><span>•</span><span>{tr("pomodoro.stats.total")} <b className="text-(--text)">{totalMin}</b></span>
        </div>
      </div>

      {focus ? (
        <div className="flex gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 shadow-sm" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div className="flex-1 min-w-0">
            <b className="block truncate text-sm font-semibold">{tr("pomodoro.focusing", { title: focusTask?.title ?? focus.title })}</b>
            {focusTask ? (
              <span className="text-xs text-(--muted)">{focusList ? `${focusList.icon} ${focusList.name} • ` : ""}{focusTask.due ? `${tr("pomodoro.due", { when: `${focusTask.due}${focusTask.dueTime ? ` ${focusTask.dueTime}` : ""}` })} • ` : ""}{focusTask.duration || 30} min • {tr("pomodoro.sessions", { done: completedSessions, total: requiredSessions || 1 })} • {isCompletable ? tr("pomodoro.completable") : tr("pomodoro.remaining", { count: requiredSessions - completedSessions })}</span>
            ) : (
              <span className="text-xs text-(--muted)">{tr("pomodoro.taskGone")}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5 items-center">
            {focusTask && !focusTask.done ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => handleStartSession(focusTask)} disabled={running}>{running ? tr("pomodoro.inProgressEllipsis") : tr("pomodoro.startSession")}</Button>
                <TooltipSimple content={!isCompletable ? tr("pomodoro.missingShort", { count: requiredSessions - completedSessions }) : tr("pomodoro.completeTask")} side="top"><span className="inline-flex"><Button variant="primary" size="sm" onClick={handleFocusDone} disabled={!isCompletable}>{tr("pomodoro.completeTask")}</Button></span></TooltipSimple>
              </>
            ) : null}
            <DeleteButton onConfirm={clear} className="scale-[0.58] origin-right -my-2" />
          </div>
        </div>
      ) : null}

      <h3 className="mt-2 text-sm font-semibold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-(--secondary)" />{tr("pomodoro.history")}</h3>
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--secondary)" />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">{tr("common.viewColon")}</span>
          {(["all", "today", "week"] as const).map((v) => (
            <button key={v} onClick={() => setHistoryRange(v)} className={`rounded-full border px-3 py-1 text-xs ${historyRange === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{v === "all" ? tr("stats.all") : v === "today" ? tr("common.today") : tr("pomodoro.range.week")}</button>
          ))}
          <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-(--muted)">{tr("pomodoro.typeColon")}</span>
          {(["all", "focus", "break"] as const).map((v) => (
            <button key={v} onClick={() => setHistoryMode(v)} className={`rounded-full border px-3 py-1 text-xs ${historyMode === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{v === "all" ? tr("common.allMasculine") : v === "focus" ? tr("pomodoro.focus") : tr("pomodoro.break")}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {filteredLog.length ? filteredLog.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-3 py-2">
              <span className={`h-3 w-3 shrink-0 rounded-full ${p.mode === "focus" ? "bg-(--accent)" : "bg-(--muted)"}`} />
              <div className="flex-1 min-w-0"><b className="text-sm">{p.minutes} min — {p.mode === "focus" ? tr("pomodoro.focus") : tr("pomodoro.break")}</b><div className="text-xs text-(--muted)">{p.date}{p.task ? ` • ${p.task}` : ""}</div></div>
              <DeleteButton onConfirm={() => handleDeleteLog(p.id)} className="scale-[0.5] origin-right -my-2 -mr-1 shrink-0" />
            </div>
          )) : <p className="py-2 text-sm text-(--muted)">{tr("pomodoro.history.empty")}</p>}
        </div>
      </div>

      {pomoTasks.length > 0 ? (
        <>
          <h3 className="mt-2 text-sm font-semibold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-(--accent)" />{tr("pomodoro.daySessions")} <span className="text-xs font-normal text-(--muted)">{tr("pomodoro.daySessions.count", { today: pomoToday.length, total: pomoTasks.length })}</span></h3>
          <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--accent)" />
            <div className="mb-3 flex gap-2">
              <button onClick={() => setPomoTab("today")} className={`rounded-full border px-3 py-1 text-xs ${pomoTab === "today" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) text-(--muted)"}`}>{tr("common.today")} ({pomoToday.length})</button>
              <button onClick={() => setPomoTab("all")} className={`rounded-full border px-3 py-1 text-xs ${pomoTab === "all" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) text-(--muted)"}`}>{tr("common.allFeminine")} ({pomoTasks.length})</button>
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
                      <div className="flex flex-wrap items-center gap-1 text-xs text-(--muted)">{li ? <span className="truncate">{li.icon} {li.name} •</span> : null}<span>{f}×25 • {mins}′ • {t.pomo || 0}/{f}</span>{t.dueTime ? <><span>•</span><span>{t.dueTime}</span></> : null}</div>
                      <div className="mt-1 flex gap-1">{blocks.map((b, i) => { const focusDone = (t.pomo || 0) > blocks.slice(0, i).filter((x) => x.type === "focus").length; return <span key={i} className={`h-1.5 w-1.5 rounded-full ${b.type === "focus" ? (focusDone ? "bg-(--secondary)" : "bg-(--border-medium)") : b.type === "longBreak" ? "bg-(--muted)" : "bg-(--border-medium)"}`} />; })}</div>
                    </div>
                    {!isFocused ? <button onClick={() => handleStartSession(t)} className="shrink-0 rounded-full border border-(--secondary-border) bg-(--secondary-light) px-2.5 py-1 text-xs font-medium text-(--secondary) hover:bg-(--secondary) hover:text-white hover:border-(--secondary)">{tr("pomodoro.startSession")}</button> : running ? <span className="shrink-0 rounded-full bg-(--secondary) px-2.5 py-1 text-xs font-bold text-white">{tr("pomodoro.inProgress")}</span> : <span className="shrink-0 rounded-full bg-(--accent) px-2.5 py-1 text-xs font-bold text-white">{tr("pomodoro.focused", { done: t.pomo || 0, total: f })}</span>}
                  </div>
                );
              })}
              {(pomoTab === "today" ? pomoToday : pomoTasks).length === 0 ? <p className="col-span-full py-4 text-center text-sm text-(--muted)">{tr("pomodoro.noTasksToday")}</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}