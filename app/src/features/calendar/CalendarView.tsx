import { useMemo } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { EventManager, type Event } from "./components/EventManager";
import { db, uid } from "@/services/storage";
import { todayISO, addDaysISO, weekdayOfISO } from "@/utils/date";

/**
 * Calendar feature - recreated with EventManager design adapted from TypeScript component.
 * Uses Creeky tasks as events, with full drag-and-drop, filters and CRUD.
 */
export function CalendarView() {
  const { store, refresh } = useCreekyStore();

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
    const due = event.startTime.toISOString().slice(0, 10);
    const dueTime = event.startTime.toTimeString().slice(0, 5);
    const duration = Math.round((event.endTime.getTime() - event.startTime.getTime()) / 60000);
    const s = db.load();
    const prioMap: Record<string, "high" | "medium" | "low" | "none"> = { red: "high", orange: "medium", green: "low", purple: "none", blue: "none", pink: "none" };
    s.tasks.unshift({
      id: uid("t"),
      title: event.title,
      description: event.description || "",
      list: s.lists[0]?.id || "inbox",
      priority: prioMap[event.color] || "none",
      due,
      dueTime,
      duration,
      repeat: [],
      remindBefore: 15,
      reminder: "",
      reminded: false,
      quadrant: "",
      pomo: 0,
      pomodoroBlocks: [],
      done: false,
      deleted: false,
      deletedAt: null,
      createdAt: Date.now(),
      tags: event.tags || [],
    });
    db.save(s);
    refresh();
  };

  const handleUpdate = (id: string, patch: Partial<Event & { _taskId: string }>) => {
    const s = db.load();
    const taskId = (patch as unknown as { _taskId?: string })._taskId || (s.tasks.find((x) => x.id === id) ? id : id.split("-")[0].includes("_") ? id.substring(0, id.indexOf("-", id.indexOf("_"))) : id.split("-")[0]);
    const t = s.tasks.find((x) => x.id === (patch as unknown as { _taskId?: string })._taskId || x.id === taskId || x.id === id);
    const target = t || s.tasks.find((x) => id.startsWith(x.id));
    if (!target) return;
    if (patch.title !== undefined) target.title = patch.title;
    if (patch.description !== undefined) target.description = patch.description || "";
    if (patch.startTime) {
      const newIso = patch.startTime.toISOString().slice(0, 10);
      if (Array.isArray(target.repeat) && target.repeat.length) {
        const oldIso = (patch as unknown as { _iso?: string })._iso;
        if (oldIso && oldIso !== newIso) {
          const oldDay = weekdayOfISO(oldIso);
          const newDay = weekdayOfISO(newIso);
          if (oldDay !== newDay) {
            target.repeat = target.repeat.filter((d) => d !== oldDay);
            if (!target.repeat.includes(newDay)) target.repeat.push(newDay);
          }
        } else {
          target.due = newIso;
          target.dueTime = patch.startTime.toTimeString().slice(0, 5);
        }
      } else {
        target.due = newIso;
        target.dueTime = patch.startTime.toTimeString().slice(0, 5);
      }
    }
    if (patch.endTime && patch.startTime) {
      target.duration = Math.round((patch.endTime.getTime() - patch.startTime.getTime()) / 60000);
    }
    if (patch.category) {
      const list = s.lists.find((l) => l.name === patch.category);
      if (list) target.list = list.id;
    }
    if (patch.color) {
      const cMap: Record<string, "high" | "medium" | "low" | "none"> = { red: "high", orange: "medium", green: "low", purple: "none", blue: "none", pink: "none" };
      if (cMap[patch.color]) target.priority = cMap[patch.color];
    }
    if (patch.tags) target.tags = patch.tags;
    db.save(s);
    refresh();
  };

  const handleDelete = (id: string) => {
    const s = db.load();
    let t = s.tasks.find((x) => x.id === id);
    if (!t) t = s.tasks.find((x) => id.startsWith(x.id));
    if (t) { t.deleted = true; t.deletedAt = Date.now(); }
    db.save(s);
    refresh();
  };

  const categories = store.lists.map((l) => l.name);
  const availableTags = store.tags;

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Calendario">
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-(--accent) to-(--secondary)" />
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-(--accent)" />
          <h3 className="font-semibold text-(--accent)">Calendario</h3>
          <span className="ml-auto text-xs text-(--muted)">{todayISO()} • {events.length} eventos (tareas con fecha)</span>
        </div>
        <p className="text-xs text-(--muted)">Diseño recreado de EventManager — drag & drop, filtros por color/etiqueta/categoría, vistas mes/semana/día/lista, todo conectado a tus tareas.</p>
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
