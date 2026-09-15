/**
 * Creeky storage — localStorage port of app/src/js/store.js
 * Keep 100% compatible with KEY = creeky_db_v1 so existing data migrates.
 */
import { APP_VERSION, DEFAULT_TAGS } from "@/types/creeky";
import type { CreekyDB, Task } from "@/types/creeky";
import { addDaysISO, isoWeekKey, mondayOfWeekKey, todayISO } from "@/utils/date";

export { APP_VERSION };

const KEY = "creeky_db_v1";

function seed(): CreekyDB {
  return {
    users: [],
    session: null,
    tags: [...DEFAULT_TAGS],
    tasks: [
      { id: "t1", title: "Revisar pendientes de la semana", description: "Revisa cada lista y pon fecha a lo importante.", list: "inbox", priority: "medium", due: new Date().toISOString().slice(0, 10), dueTime: "09:00", duration: 30, repeat: [], remindBefore: 15, reminder: "", reminded: false, quadrant: "", pomo: 0, pomodoroBlocks: [], done: false, deleted: false, deletedAt: null, createdAt: Date.now(), tags: ["personal"] },
      { id: "t2", title: "Probar Pomodoro de 25 min", description: "", list: "trabajo", priority: "high", due: "", dueTime: "", duration: 30, repeat: [1, 3, 5], remindBefore: 15, reminder: "", reminded: false, quadrant: "", pomo: 0, pomodoroBlocks: [], done: false, deleted: false, deletedAt: null, createdAt: Date.now(), tags: ["trabajo"] },
    ],
    lists: [
      { id: "inbox", name: "Bandeja de entrada", description: "Captura rápida sin clasificar.", color: "#212121", icon: "📥" },
      { id: "trabajo", name: "Trabajo", description: "Pendientes laborales.", color: "#3949AB", icon: "💼" },
      { id: "personal", name: "Personal", description: "Asuntos propios.", color: "#00897B", icon: "🏠" },
    ],
    habits: [
      { id: "h1", name: "Leer 20 min", streak: 3, best: 3, days: [1, 1, 1, 0, 1, 0, 0], history: {}, week: isoWeekKey(new Date()), notify: true, notifyTime: "09:00", lastPing: "" },
      { id: "h2", name: "Ejercicio", streak: 5, best: 5, days: [1, 1, 1, 1, 1, 0, 0], history: {}, week: isoWeekKey(new Date()), notify: true, notifyTime: "09:00", lastPing: "" },
    ],
    matrix: { q1: ["Entrega urgente"], q2: ["Planear semana"], q3: [], q4: [] },
    countdowns: [
      { id: "c1", title: "Viaje", date: new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10), created: Date.now() - 20 * 864e5 },
    ],
    pomoLog: [],
    notifications: [
      { id: "n1", title: "Bienvenido a Creeky", text: "Tu clon personal de TickTick está listo.", time: "ahora", unread: true, kind: "system" },
    ],
  };
}

function calcStreak(h: CreekyDB["habits"][number]): number {
  const done = new Set(Object.entries(h.history || {}).filter(([, v]) => v).map(([k]) => k));
  const mon = mondayOfWeekKey(h.week || isoWeekKey(new Date()));
  (h.days || []).forEach((d, i) => { if (d) done.add(addDaysISO(mon, i)); });
  let d = todayISO();
  if (!done.has(d)) d = addDaysISO(d, -1);
  let n = 0;
  while (done.has(d)) { n++; d = addDaysISO(d, -1); }
  return n;
}

function migrate(s: CreekyDB): CreekyDB {
  let dirty = false;
  const ensureArr = (k: keyof CreekyDB, fb: unknown[] = []) => {
    if (!Array.isArray((s as unknown as Record<string, unknown>)[k])) {
      (s as unknown as Record<string, unknown>)[k] = fb;
      dirty = true;
    }
  };
  ensureArr("tasks"); ensureArr("lists"); ensureArr("habits");
  ensureArr("countdowns"); ensureArr("pomoLog"); ensureArr("notifications");
  if (!Array.isArray(s.tags) || !s.tags.length) { s.tags = [...DEFAULT_TAGS]; dirty = true; }
  if (!s.matrix || typeof s.matrix !== "object") { s.matrix = { q1: [], q2: [], q3: [], q4: [] }; dirty = true; }
  (["q1", "q2", "q3", "q4"] as const).forEach((q) => { if (!Array.isArray(s.matrix[q])) { s.matrix[q] = []; dirty = true; } });
  const validLists = new Set((s.lists || []).map((l) => l.id));
  s.tasks.forEach((t) => {
    if (t.done === undefined) { (t as Task).done = false; dirty = true; }
    if (t.quadrant === undefined) { t.quadrant = ""; dirty = true; }
    if (t.pomo === undefined) { t.pomo = 0; dirty = true; }
    if (!Array.isArray(t.pomodoroBlocks)) { t.pomodoroBlocks = []; dirty = true; }
    if (!validLists.has(t.list)) { t.list = "inbox"; dirty = true; }
    if (t.description === undefined) { t.description = ""; dirty = true; }
    if (t.reminder === undefined) { t.reminder = ""; dirty = true; }
    if (t.dueTime === undefined) { t.dueTime = ""; dirty = true; }
    if (t.duration === undefined) { t.duration = 30; dirty = true; }
    if (!Array.isArray(t.repeat)) { t.repeat = []; dirty = true; }
    if (t.remindBefore === undefined) { t.remindBefore = 15; dirty = true; }
    if (t.reminded === undefined) { t.reminded = false; dirty = true; }
    if (t.deleted === undefined) { t.deleted = false; dirty = true; }
    if (t.deletedAt === undefined) { t.deletedAt = null; dirty = true; }
    if (t.createdAt === undefined) { t.createdAt = Date.now(); dirty = true; }
    if (!Array.isArray(t.tags)) { t.tags = []; dirty = true; }
  });
  s.lists.forEach((l) => {
    if (!l.color) { (l as unknown as Record<string, unknown>).color = "#616161"; dirty = true; }
    if (!l.icon) { (l as unknown as Record<string, unknown>).icon = "📋"; dirty = true; }
    if (l.description === undefined) { l.description = ""; dirty = true; }
  });
  s.notifications.forEach((n) => {
    if (n.unread === undefined) { (n as unknown as Record<string, unknown>).unread = true; dirty = true; }
    if (!n.kind) { (n as unknown as Record<string, unknown>).kind = /^⏰/.test(n.title || "") ? "reminder" : /^📅/.test(n.title || "") ? "calendar" : "system"; dirty = true; }
  });
  s.habits.forEach((h) => {
    if (!Array.isArray(h.days)) { h.days = [0, 0, 0, 0, 0, 0, 0]; dirty = true; }
    if (h.streak === undefined) { h.streak = 0; dirty = true; }
    if (h.best === undefined) { h.best = h.streak || 0; dirty = true; }
    if (!h.history || typeof h.history !== "object") { h.history = {}; dirty = true; }
    if (!h.week) { h.week = isoWeekKey(new Date()); dirty = true; }
    if (h.notify === undefined) { h.notify = true; dirty = true; }
    if (!h.notifyTime) { h.notifyTime = "09:00"; dirty = true; }
    if (h.lastPing === undefined) { h.lastPing = ""; dirty = true; }
  });
  if (dirty) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
  return s;
}

export function rolloverHabits(s: CreekyDB): boolean {
  const cur = isoWeekKey(new Date());
  let changed = false;
  (s.habits || []).forEach((h) => {
    if (!h.week) { h.week = cur; changed = true; }
    if (h.week !== cur) {
      const mon = mondayOfWeekKey(h.week);
      h.history = h.history || {};
      (h.days || []).forEach((d, i) => { if (d) h.history[addDaysISO(mon, i)] = 1; });
      h.days = [0, 0, 0, 0, 0, 0, 0];
      h.week = cur;
      changed = true;
    }
    const st = calcStreak(h);
    if (h.streak !== st) { h.streak = st; changed = true; }
    if ((h.best || 0) < st) { h.best = st; changed = true; }
  });
  return changed;
}

export const db = {
  load(): CreekyDB {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
      const s = JSON.parse(raw) as CreekyDB;
      return migrate(s);
    } catch { const s = seed(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } return s; }
  },
  save(s: CreekyDB): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } },
  clear(): void { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export function registerTags(s: CreekyDB, tags: string[] = []): boolean {
  let added = false;
  tags.map((t) => (t || "").trim().toLowerCase()).filter(Boolean).forEach((t) => {
    if (!s.tags.includes(t)) { s.tags.push(t); added = true; }
  });
  return added;
}

export const uid = (p = "id"): string => p + "_" + Math.random().toString(36).slice(2, 8);

export { calcStreak };
