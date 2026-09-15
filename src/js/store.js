// Creeky - Store local (localStorage) - sin backend, solo uso personal
const KEY = 'creeky_db_v1';
export const APP_VERSION = '31';

export const DEFAULT_TAGS = ['trabajo', 'personal', 'urgente'];

const seed = () => ({
  users: [],
  session: null,
  tags: [...DEFAULT_TAGS],
  tasks: [
    { id: 't1', title: 'Revisar pendientes de la semana', description: 'Revisa cada lista y pon fecha a lo importante.', list: 'inbox', priority: 'medium', due: new Date().toISOString().slice(0,10), dueTime: '09:00', duration: 30, repeat: [], remindBefore: 15, reminder: '', reminded: false, done: false, deleted: false, deletedAt: null, createdAt: Date.now(), tags: ['personal'] },
    { id: 't2', title: 'Probar Pomodoro de 25 min', description: '', list: 'trabajo', priority: 'high', due: '', dueTime: '', duration: 30, repeat: [1,3,5], remindBefore: 15, reminder: '', reminded: false, done: false, deleted: false, deletedAt: null, createdAt: Date.now(), tags: ['trabajo'] },
  ],
  lists: [
    { id: 'inbox', name: 'Bandeja de entrada', description: 'Captura rápida sin clasificar.', color: '#212121', icon: '📥' },
    { id: 'trabajo', name: 'Trabajo', description: 'Pendientes laborales.', color: '#3949AB', icon: '💼' },
    { id: 'personal', name: 'Personal', description: 'Asuntos propios.', color: '#00897B', icon: '🏠' },
  ],
  habits: [
    { id: 'h1', name: 'Leer 20 min', streak: 3, days: [1,1,1,0,1,0,0] },
    { id: 'h2', name: 'Ejercicio', streak: 5, days: [1,1,1,1,1,0,0] },
  ],
  matrix: { q1: ['Entrega urgente'], q2: ['Planear semana'], q3: [], q4: [] },
  countdowns: [
    { id: 'c1', title: 'Viaje', date: new Date(Date.now()+12*864e5).toISOString().slice(0,10), created: Date.now()-20*864e5 }
  ],
  pomoLog: [],
  notifications: [
    { id: 'n1', title: 'Bienvenido a Creeky', text: 'Tu clon personal de TickTick está listo.', time: 'ahora', unread: true, kind: 'system' }
  ]
});

export const db = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
      const s = JSON.parse(raw);
      return migrate(s);
    } catch { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
  },
  save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
};

// Migra DBs viejas: garantiza TODAS las colecciones para que ningún conteo muera
function migrate(s) {
  let dirty = false;
  const ensureArr = (k, fb = []) => { if (!Array.isArray(s[k])) { s[k] = fb; dirty = true; } };
  ensureArr('tasks'); ensureArr('lists'); ensureArr('habits');
  ensureArr('countdowns'); ensureArr('pomoLog'); ensureArr('notifications');
  if (!Array.isArray(s.tags) || !s.tags.length) { s.tags = [...DEFAULT_TAGS]; dirty = true; }
  if (!s.matrix || typeof s.matrix !== 'object') { s.matrix = { q1: [], q2: [], q3: [], q4: [] }; dirty = true; }
  ['q1', 'q2', 'q3', 'q4'].forEach(q => { if (!Array.isArray(s.matrix[q])) { s.matrix[q] = []; dirty = true; } });
  const validLists = new Set((s.lists || []).map(l => l.id));
  s.tasks.forEach(t => {
    if (t.done === undefined) { t.done = false; dirty = true; }
    if (t.quadrant === undefined) { t.quadrant = ''; dirty = true; } // '' = auto; q1..q4 = fijado a mano
    if (t.pomo === undefined) { t.pomo = 0; dirty = true; } // sesiones pomodoro dedicadas
    if (!Array.isArray(t.pomodoroBlocks)) { t.pomodoroBlocks = []; dirty = true; }
    if (!validLists.has(t.list)) { t.list = 'inbox'; dirty = true; } // huérfanas → Bandeja
    if (t.description === undefined) { t.description = ''; dirty = true; }
    if (t.reminder === undefined) { t.reminder = ''; dirty = true; }
    if (t.dueTime === undefined) { t.dueTime = ''; dirty = true; }
    if (t.duration === undefined) { t.duration = 30; dirty = true; }
    if (!Array.isArray(t.repeat)) { t.repeat = []; dirty = true; }
    if (t.remindBefore === undefined) { t.remindBefore = 15; dirty = true; }
    if (t.reminded === undefined) { t.reminded = false; dirty = true; }
    if (t.deleted === undefined) { t.deleted = false; dirty = true; }
    if (t.deletedAt === undefined) { t.deletedAt = null; dirty = true; }
    if (t.createdAt === undefined) { t.createdAt = Date.now(); dirty = true; }
    if (!Array.isArray(t.tags)) { t.tags = []; dirty = true; }
  });
  s.lists.forEach(l => {
    if (!l.color) { l.color = '#616161'; dirty = true; }
    if (!l.icon) { l.icon = '📋'; dirty = true; }
    if (l.description === undefined) { l.description = ''; dirty = true; }
  });
  s.notifications.forEach(n => {
    // Sin bandera explícita => se considera novedad (sin leer)
    if (n.unread === undefined) { n.unread = true; dirty = true; }
    if (!n.kind) { n.kind = /^⏰/.test(n.title || '') ? 'reminder' : /^📅/.test(n.title || '') ? 'calendar' : 'system'; dirty = true; }
  });
  s.habits.forEach(h => {
    if (!Array.isArray(h.days)) { h.days = [0, 0, 0, 0, 0, 0, 0]; dirty = true; }
    if (h.streak === undefined) { h.streak = 0; dirty = true; }
    if (h.best === undefined) { h.best = h.streak || 0; dirty = true; }
    if (!h.history || typeof h.history !== 'object') { h.history = {}; dirty = true; }
    if (!h.week) { h.week = isoWeekKey(new Date()); dirty = true; }
    if (h.notify === undefined) { h.notify = true; dirty = true; }
    if (!h.notifyTime) { h.notifyTime = '09:00'; dirty = true; }
    if (h.lastPing === undefined) { h.lastPing = ''; dirty = true; }
  });
  if (dirty) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
  return s;
}

/* ---------- Planificación: franjas, choques, repetición ---------- */
export const REMIND_OPTIONS = [
  { v: 0, label: 'Sin aviso' },
  { v: 5, label: '5 min antes' },
  { v: 15, label: '15 min antes' },
  { v: 30, label: '30 min antes' },
  { v: 60, label: '1 hora antes' },
  { v: 1440, label: '1 día antes' },
];

export const PRIO_META = {
  high: { mark: '!', label: '¡Alta!', color: '#C62828' },
  medium: { mark: '!', label: '¡Media!', color: '#B58900' },
  low: { mark: '!', label: '¡Baja!', color: '#2E7D32' },
  none: { mark: '○', label: 'Ninguna', color: '#9E9E9E' },
};

// Emojis sugeridos para listas (los únicos emojis de la app: los elige el usuario)
export const LIST_EMOJIS = ['📋', '📥', '💼', '🏠', '📚', '🛒', '✈️', '💡', '🎯', '❤️', '⭐', '🎨', '⚽', '💰'];

// Galería completa por categorías para el picker de listas
export const EMOJI_GRID = [
  { cat: 'Caras y gestos', items: ['😀','😁','😂','🤣','😊','😍','😎','🤔','😴','😷','🤯','🥳','😭','😡','👋','👍','👎','👏','🙌','💪','🤝','👀','🧠','❤️','💯'] },
  { cat: 'Trabajo y hogar', items: ['📋','📥','💼','🏠','📚','🛒','💰','🎓','🏥','🧹','🔧','🔑','🖨️','📱','💻','⏰','🔔'] },
  { cat: 'Lugares y viajes', items: ['✈️','🚗','🚲','🏖️','🏔️','🗺️','🏟️','⛺','🌍','🏙️','🚂','⛵'] },
  { cat: 'Naturaleza', items: ['🌱','🌳','🌸','☀️','🌙','⭐','🔥','💧','🌈','❄️','🌊','🍀'] },
  { cat: 'Comida', items: ['🍎','🍕','☕','🍰','🍔','🥗','🍩','🧃','🍇','🥑'] },
  { cat: 'Actividades', items: ['⚽','🏀','🎮','🎨','🎵','📖','✏️','🎬','🏋️','🧘','🎲','🎸'] },
  { cat: 'Ideas y metas', items: ['💡','🎯','🚀','🌟','✅','❌','❗','❓','💤','🏆','📌','📈'] },
];

export const WEEKDAYS = [
  { v: 1, label: 'L' }, { v: 2, label: 'M' }, { v: 3, label: 'X' },
  { v: 4, label: 'J' }, { v: 5, label: 'V' }, { v: 6, label: 'S' }, { v: 0, label: 'D' },
];

export const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const todayISO = () => isoOf(new Date());
// Domingo de la semana actual (para el segmento Semana)
export const weekEndISO = () => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return isoOf(d); };

// Cuadrante <-> prioridad (la matriz se sincroniza con la prioridad)
export const Q_PRIO = { q1: 'high', q2: 'medium', q3: 'low', q4: 'none' };

// Clave de semana ISO: 'YYYY-WNN'
export function isoWeekKey(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - day + 3);
  const jan4 = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Lunes de una clave 'YYYY-WNN' en ISO
export function mondayOfWeekKey(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(key || '');
  if (!m) { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); }
  const jan4 = new Date(+m[1], 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (+m[2] - 1) * 7);
  return isoOf(mon);
}

// Racha: días consecutivos marcados hasta hoy (si hoy falta, vale con ayer)
export function calcStreak(h) {
  const done = new Set(Object.entries(h.history || {}).filter(([, v]) => v).map(([k]) => k));
  const mon = mondayOfWeekKey(h.week || isoWeekKey(new Date()));
  (h.days || []).forEach((d, i) => { if (d) done.add(addDaysISO(mon, i)); });
  let d = todayISO();
  if (!done.has(d)) d = addDaysISO(d, -1);
  let n = 0;
  while (done.has(d)) { n++; d = addDaysISO(d, -1); }
  return n;
}

// Al cambiar de semana: archiva la anterior en history y reinicia días (racha intacta)
export function rolloverHabits(s) {
  const cur = isoWeekKey(new Date());
  let changed = false;
  (s.habits || []).forEach(h => {
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
export const addDaysISO = (iso, n) => { const [y,m,d] = iso.split('-').map(Number); const dt = new Date(y, m-1, d); dt.setDate(dt.getDate()+n); return isoOf(dt); };
export const weekdayOfISO = (iso) => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d).getDay(); }; // 0=Dom
export const toMin = (hhmm) => { const [h, m] = String(hhmm||'').split(':').map(Number); return h*60 + (m||0); };

// Inicio/fin en minutos del día. Sin hora => null (todo el día, no bloquea franja)
export function slotOf(t) {
  if (!t.due || !t.dueTime) return null;
  const start = toMin(t.dueTime);
  return { start, end: start + (+t.duration || 30) };
}

// ¿La candidata choca con otra tarea viva el mismo día? (solo si ambas tienen hora)
export function findConflict(s, cand, ignoreId = null) {
  const slot = slotOf(cand);
  if (!slot) return null;
  return s.tasks.find(t => {
    if (t.deleted || t.done || t.id === ignoreId) return false;
    if (t.due !== cand.due) return false;
    const o = slotOf(t);
    if (!o) return false;
    return slot.start < o.end && o.start < slot.end;
  }) || null;
}

// ¿Ocurre la tarea en el día iso? (fecha exacta o repetición semanal)
export function occursOn(t, iso) {
  if (t.deleted) return false;
  if (t.due === iso) return true;
  if (Array.isArray(t.repeat) && t.repeat.length) {
    if (!t.due || iso >= t.due) return t.repeat.includes(weekdayOfISO(iso));
  }
  return false;
}

export function listColor(s, listId) {
  return s.lists.find(l => l.id === listId)?.color || '#616161';
}

export function registerTags(s, tags = []) {
  let added = false;
  tags.map(t => (t || '').trim().toLowerCase()).filter(Boolean).forEach(t => {
    if (!s.tags.includes(t)) { s.tags.push(t); added = true; }
  });
  return added;
}

export const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,8);

