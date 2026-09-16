import { useMemo, useState } from "react";
import type { CreekyDB, Task } from "@/types/creeky";
import { addDaysISO, todayISO } from "@/utils/date";

export interface TasksViewState {
  prio: string;
  tag: string;
  sort: string;
  layout: string;
  listSort: boolean;
  hideEmpty: boolean;
  tagSort: boolean;
}

export interface TasksUiState {
  filter: string;
  sub: string;
  view: TasksViewState;
  openDetails: Set<string>;
}

const defaultView: TasksViewState = {
  prio: "all",
  tag: "all",
  sort: "manual",
  layout: "list",
  listSort: false,
  hideEmpty: false,
  tagSort: false,
};

export function useTasksUi(store: CreekyDB) {
  const [ui, setUi] = useState<TasksUiState>({
    filter: "inbox",
    sub: "open",
    view: defaultView,
    openDetails: new Set(),
  });

  const updateView = (patch: Partial<TasksViewState>) =>
    setUi((p) => ({ ...p, view: { ...p.view, ...patch } }));

  const setFilter = (filter: string) =>
    setUi((p) => ({
      ...p,
      filter,
      sub: filter === "trash" ? "trash" : p.sub === "trash" ? "open" : p.sub,
      openDetails: new Set(),
    }));

  const setSub = (sub: string) => setUi((p) => ({ ...p, sub, openDetails: new Set() }));

  const toggleDetail = (id: string) =>
    setUi((p) => {
      const n = new Set(p.openDetails);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return { ...p, openDetails: n };
    });

  const closeDetail = (id: string) =>
    setUi((p) => {
      const n = new Set(p.openDetails);
      n.delete(id);
      return { ...p, openDetails: n };
    });

  const clearDetails = () => setUi((p) => ({ ...p, openDetails: new Set() }));
  const resetFilters = () => setUi((p) => ({ ...p, view: defaultView, sub: "open", openDetails: new Set() }));

  const derived = useMemo(() => {
    const alive = store.tasks.filter((t) => !t.deleted);
    const trash = store.tasks.filter((t) => t.deleted);
    const inScope =
      ui.filter === "all"
        ? alive
        : ui.filter === "today"
          ? alive.filter((t) => t.due === todayISO())
          : ui.filter === "trash"
            ? []
            : alive.filter((t) => t.list === ui.filter);

    const openTasks = inScope.filter((t) => !t.done);
    const doneT = inScope.filter((t) => t.done);

    const applyView = (list: Task[]) => {
      let r: Task[] = list;
      if (ui.view.prio !== "all") r = r.filter((t) => (t.priority || "none") === ui.view.prio);
      if (ui.view.tag !== "all") r = r.filter((t) => (t.tags || []).includes(ui.view.tag));
      const PRIO_W: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
      if (ui.view.sort === "due") r = [...r].sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
      else if (ui.view.sort === "prio") r = [...r].sort((a, b) => PRIO_W[a.priority || "none"] - PRIO_W[b.priority || "none"]);
      else if (ui.view.sort === "title") r = [...r].sort((a, b) => a.title.localeCompare(b.title, "es"));
      return r;
    };

    const shown = applyView(ui.filter === "trash" ? trash : ui.sub === "done" ? doneT : ui.sub === "trash" ? trash : openTasks);
    const boardShown = applyView(ui.sub === "trash" ? trash : alive.filter((t) => (ui.sub === "done" ? t.done : !t.done)));

    const visLists = (() => {
      let l = [...store.lists];
      if (ui.view.hideEmpty) l = l.filter((li) => alive.some((t) => t.list === li.id && !t.done));
      if (ui.view.listSort) l.sort((a, b) => a.name.localeCompare(b.name, "es"));
      return l;
    })();

    const visTags = (() => {
      let t = [...store.tags];
      if (ui.view.tagSort) t.sort((a, b) => a.localeCompare(b, "es"));
      return t;
    })();

    const segments = {
      today: alive.filter((t) => !t.done && t.due === todayISO()).length,
      week: alive.filter((t) => !t.done && t.due && t.due > todayISO() && t.due <= addDaysISO(todayISO(), 7)).length,
      inbox: alive.filter((t) => !t.done && t.list === "inbox").length,
    };

    return { alive, trash, inScope, openTasks, doneT, shown, boardShown, visLists, visTags, segments };
  }, [store.lists, store.tags, store.tasks, ui]);

  return { ui, setUi, updateView, setFilter, setSub, toggleDetail, closeDetail, clearDetails, resetFilters, derived };
}
