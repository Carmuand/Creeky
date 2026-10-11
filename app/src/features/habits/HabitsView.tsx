import { useMemo, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { todayISO, addDaysISO, isoWeekKey, mondayOfWeekKey } from "@/utils/date";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { useWeekdays } from "@/i18n/labels";
import { habitsApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { DeleteButton } from "@/components/ui/delete-button";

/**
 * Habits view with the weekly check table, streaks and daily reminders.
 *
 * @returns The habits view.
 */
export function HabitsView() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const weekdays = useWeekdays();

  const report = (error: unknown) => pushToast(errorMessage(error), "error");
  const [filter, setFilter] = useState<"all" | "active" | "hot" | "fresh">("all");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const monday = mondayOfWeekKey(isoWeekKey(new Date()));
  const sunday = addDaysISO(monday, 6);
  const todayStr = todayISO();
  const monthPrefix = todayStr.slice(0, 7);

  const monthChecks = useMemo(() => store.habits.reduce((a, h) => a + Object.keys(h.history || {}).filter((k) => k.startsWith(monthPrefix)).length + (h.days || []).filter(Boolean).length, 0), [store.habits, monthPrefix]);
  const activeR = useMemo(() => store.habits.filter((h) => (h.streak || 0) > 0).length, [store.habits]);
  const bestAll = useMemo(() => Math.max(0, ...store.habits.map((h) => h.best || 0)), [store.habits]);

  const fmtR = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "short" }); };

  const handleAdd = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = newName.trim();
    if (!v) return;
    habitsApi.create(v).catch(report);
    setNewName("");
  };

  const toggleDay = (id: string, idx: number) => {
    habitsApi.toggleDay(id, addDaysISO(monday, idx)).catch(report);
  };

  const toggleNotify = (id: string) => {
    const habit = store.habits.find((x) => x.id === id);
    if (!habit) return;
    habitsApi.update(id, { notify: !habit.notify }).catch(report);
  };

  const changeTime = (id: string, time: string) => {
    if (!time) return;
    habitsApi.update(id, { notifyTime: time }).catch(report);
  };

  const remove = (id: string) => {
    habitsApi.remove(id).catch(report);
  };

  const saveEdit = (id: string) => {
    const v = editVal.trim();
    if (!v) return;
    habitsApi.update(id, { name: v }).catch(report);
    setEditing(null);
  };

  const filtered = store.habits.filter((h) => {
    const st = h.streak || 0;
    if (filter === "active") return st > 0;
    if (filter === "hot") return st >= 5;
    if (filter === "fresh") return st === 0;
    return true;
  });

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.habits")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">{t("habits.intro")}</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("habits.new.placeholder")} className="min-w-50" />
          <Button type="submit" variant="primary">+</Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <span className="flex items-center gap-1.5">{t("habits.stats.active")} <b className="text-base text-(--secondary)">{activeR}</b></span>
        <span className="flex items-center gap-1.5">{t("habits.stats.month")} <b className="text-base text-(--accent)">{monthChecks}</b></span>
        <span className="flex items-center gap-1.5">{t("habits.stats.best")} <b className="text-base text-(--secondary)">{bestAll}</b></span>
        <span className="ml-auto text-xs text-(--muted)">{t("habits.week", { from: fmtR(monday), to: fmtR(sunday) })}</span>
      </div>

      <p className="px-1 text-sm text-(--muted)">{t("habits.explain.before")} <b className="font-semibold">{t("habits.explain.bold")}</b> {t("habits.explain.after")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("common.viewColon")}</span>
        {(["all", "active", "hot", "fresh"] as const).map((v) => {
          const isSecondary = v === "active" || v === "hot";
          return (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-full border px-3 py-1 text-xs ${filter === v ? (isSecondary ? "bg-(--secondary) border-(--secondary) text-white font-semibold" : "bg-(--accent) border-(--accent) text-white font-semibold") : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>
              {v === "all" ? t("habits.filter.all", { count: store.habits.length }) : v === "active" ? t("habits.filter.active") : v === "hot" ? t("habits.filter.hot") : t("habits.filter.fresh")}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--secondary) to-(--accent)" />
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--border-light) text-center">
              <th className="px-2 py-2 text-left font-semibold text-(--accent)">{t("habits.column.habit")}</th>
              {weekdays.map((weekday, i) => {
                const iso = addDaysISO(monday, i);
                return (
                  <th key={weekday.v} className="px-2 py-2 font-semibold">
                    <TooltipSimple content={iso} side="top"><span className="inline-block">{weekday.label}<br /><small className="font-normal text-(--muted)">{Number(iso.slice(8))}</small></span></TooltipSimple>
                  </th>
                );
              })}
              <th className="px-2 py-2 font-semibold text-(--secondary)">{t("habits.column.streak")}</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-(--border-light) text-center last:border-0">
                <td className="px-2 py-2 text-left">
                  {editing === h.id ? (
                    <span className="flex gap-1.5"><Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="flex-1" autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveEdit(h.id); }} /><Button variant="primary" size="sm" onClick={() => saveEdit(h.id)}>OK</Button></span>
                  ) : (
                    <span className="font-medium">{h.name}</span>
                  )}
                  <br />
                  <span className="mt-1 inline-flex items-center gap-1">
                    <TooltipSimple content={t("habits.dailyReminder")} side="top">
                      <button onClick={() => toggleNotify(h.id)} className={`flex h-6 w-6 items-center justify-center rounded-md ${h.notify ? "bg-(--accent-light) text-(--accent)" : "text-(--muted) hover:bg-(--bg-hover)"}`}><Icon name="bell" size={13} /></button>
                    </TooltipSimple>
                    <TooltipSimple content={t("habits.reminderTime")} side="top"><input type="time" aria-label={t("habits.reminderTime")} value={h.notifyTime || "09:00"} onChange={(e) => changeTime(h.id, e.target.value)} className="rounded-md border border-(--border-medium) bg-(--bg-primary) px-1.5 py-1 text-xs" /></TooltipSimple>
                  </span>
                </td>
                  {h.days.map((d, i) => {
                  const iso = addDaysISO(monday, i);
                  const future = iso > todayStr;
                  return (
                    <td key={i} className="px-1 py-2 text-center">
                      <TooltipSimple content={future ? t("habits.future") : t("habits.mark", { date: iso })} side="top">
                        <button disabled={future} onClick={() => toggleDay(h.id, i)} className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${d ? "bg-(--secondary) border-(--secondary) text-white" : "border-(--border-medium) bg-(--bg-primary) text-transparent hover:border-(--secondary)"} ${future ? "opacity-25 cursor-not-allowed" : ""}`}>{d ? "✓" : ""}</button>
                      </TooltipSimple>
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <TooltipSimple content={t("habits.bestStreak", { count: h.best || 0 })} side="top"><span className="inline-flex items-center gap-1 text-xs"><Icon name="zap" size={14} /> {h.streak}</span></TooltipSimple>
                  <div className="text-xs text-(--muted)">{t("habits.best", { count: h.best || 0 })}</div>
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  <span className="flex gap-1 items-center">
                    <TooltipSimple content={t("habits.editName")} side="top"><button onClick={() => { setEditing(h.id); setEditVal(h.name); }} className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)"><Icon name="pencil" size={14} /></button></TooltipSimple>
                    <DeleteButton onConfirm={() => remove(h.id)} className="scale-[0.58] origin-right -my-2" />
                  </span>
                </td>
              </tr>
            ))}
            {!filtered.length ? <tr><td colSpan={10} className="py-6 text-center text-sm text-(--muted)">{t("common.emptyView")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}