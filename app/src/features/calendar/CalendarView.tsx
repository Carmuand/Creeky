import { useMemo } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { EventManager, type Event } from "./components/EventManager";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { tasksApi } from "@/services/api";
import { isoOf } from "@/utils/date";
import type { Priority } from "@/types/creeky";
import type { TaskPatch } from "@/types/pywebview";

/**
 * Priority assigned to a task for each event color.
 */
const COLOR_PRIORITY: Record<string, Priority> = { red: "high", orange: "medium", green: "low", purple: "none", blue: "none", pink: "none" };
import { todayISO, addDaysISO, weekdayOfISO } from "@/utils/date";

/**
 * Calendar view that shows Creeky tasks as events, with drag and drop,
 * filters and create, update and delete actions.
 *
 * @returns The calendar view.
 */
export function CalendarView() {
  const { store } = useCreekyStore();
  const { t } = useI18n();

  const report = (error: unknown) => pushToast(errorMessage(error), "error");
  const timeOf = (date: Date) => date.toTimeString().slice(0, 5);

  const events: Event[] = useMemo(() => {
    const result: (Event & { _taskId: string; _iso: string; _bgColor: string })[] = [];
    const today = todayISO();
    const rangeStart = addDaysISO(today, -30);
    const rangeEnd = addDaysISO(today, 180);
    const listColorMap = new Map(store.lists.map((l) => [l.id, l.color]));
    for (const t of store.tasks.filter((t) => !t.deleted && !t.done)) {
      const category = store.lists.find((l) => l.id === t.list)?.name || t.list;
      const bgColor = listColorMap.get(t.list) || "#8060B3";
      const colorMap: Record<string, string> = { high: "red", medium: "orange", low: "green", none: "purple" };
      const color = colorMap[t.priority || "none"] || "purple";
      const dueTime = t.dueTime || "09:00";
      const duration = t.duration || 30;
      const makeEvent = (iso: string, idSuffix = "") => {
        const start = new Date(`${iso}T${dueTime}:00`);
        if (isNaN(start.getTime())) return null;
        const end = new Date(start.getTime() + duration * 60000);
        return {
          id: `${t.id}${idSuffix}`,
          title: t.title,
          description: t.description || "",
          startTime: start,
          endTime: end,
          color,
          category,
          tags: t.tags || [],
          _taskId: t.id,
          _iso: iso,
          _bgColor: bgColor,
        } as Event & { _taskId: string; _iso: string; _bgColor: string };
      };

      if (Array.isArray(t.repeat) && t.repeat.length) {
        let cur = t.due && t.due >= rangeStart ? t.due : rangeStart;
        if (t.due && cur < t.due) cur = t.due;
        let iter = cur;
        let count = 0;
        while (iter <= rangeEnd && count < 200) {
          if (t.repeat.includes(weekdayOfISO(iter))) {
            const ev = makeEvent(iter, `-${iter}`);
            if (ev) result.push(ev);
          }
          iter = addDaysISO(iter, 1);
          count++;
        }
      } else if (t.due) {
        const ev = makeEvent(t.due);
        if (ev) result.push(ev);
      } else {
        const base = t.createdAt ? new Date(t.createdAt) : new Date();
        const iso = base.toISOString().slice(0, 10);
        const ev = makeEvent(iso);
        if (ev) result.push(ev);
      }
    }
    return result;
  }, [store.tasks, store.lists]);

  const handleCreate = (event: Omit<Event, "id">) => {
    const list = store.lists.find((l) => l.name === event.category) ?? store.lists[0];
    tasksApi
      .create({
        title: event.title,
        description: event.description || "",
        list: list?.id || "inbox",
        priority: COLOR_PRIORITY[event.color] || "none",
        due: isoOf(event.startTime),
        dueTime: timeOf(event.startTime),
        duration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / 60000),
        tags: event.tags || [],
      })
      .catch(report);
  };

  const handleUpdate = (id: string, patch: Partial<Event & { _taskId: string }>) => {
    const target = store.tasks.find((x) => x.id === patch._taskId) ?? store.tasks.find((x) => x.id === id) ?? store.tasks.find((x) => id.startsWith(x.id));
    if (!target) return;
    const changes: TaskPatch = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.description !== undefined) changes.description = patch.description || "";
    if (patch.startTime) {
      const newIso = isoOf(patch.startTime);
      const oldIso = patch._iso;
      if (Array.isArray(target.repeat) && target.repeat.length && oldIso && oldIso !== newIso) {
        const oldDay = weekdayOfISO(oldIso);
        const newDay = weekdayOfISO(newIso);
        if (oldDay !== newDay) changes.repeat = [...new Set([...target.repeat.filter((d) => d !== oldDay), newDay])];
      } else {
        changes.due = newIso;
        changes.dueTime = timeOf(patch.startTime);
      }
    }
    if (patch.endTime && patch.startTime) {
      changes.duration = Math.round((patch.endTime.getTime() - patch.startTime.getTime()) / 60000);
    }
    if (patch.category) {
      const list = store.lists.find((l) => l.name === patch.category);
      if (list) changes.list = list.id;
    }
    if (patch.color && COLOR_PRIORITY[patch.color]) changes.priority = COLOR_PRIORITY[patch.color];
    if (patch.tags) changes.tags = patch.tags;
    tasksApi.update(target.id, changes).catch(report);
  };

  const handleDelete = (id: string) => {
    const target = store.tasks.find((x) => x.id === id) ?? store.tasks.find((x) => id.startsWith(x.id));
    if (target) tasksApi.update(target.id, { deleted: true }).catch(report);
  };

  const categories = store.lists.map((l) => l.name);
  const availableTags = store.tags;

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.calendar")}>
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-(--accent)" />
          <h3 className="font-semibold text-(--accent)">{t("nav.calendar")}</h3>
          <span className="ml-auto text-xs text-(--muted)">{t("calendar.summary", { date: todayISO(), count: events.length })}</span>
        </div>
        <p className="text-xs text-(--muted)">{t("calendar.intro")}</p>
      </div>
      <EventManager
        events={events}
        onEventCreate={handleCreate}
        onEventUpdate={handleUpdate}
        onEventDelete={handleDelete}
        categories={categories.length ? categories : ["Meeting", "Task", "Reminder", "Personal"]}
        availableTags={availableTags.length ? availableTags : ["Important", "Urgent", "Work", "Personal", "Team", "Client"]}
        defaultView="month"
      />
    </section>
  );
}
