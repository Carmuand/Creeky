/**
 * Creeky domain types — port of store.js schema to TypeScript.
 */

export type Priority = "high" | "medium" | "low" | "none";
export type Quadrant = "q1" | "q2" | "q3" | "q4" | "";

export interface PomodoroBlock {
  type: "focus" | "shortBreak" | "longBreak";
  duration: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  list: string;
  priority: Priority;
  due: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  duration: number;
  repeat: number[]; // 0=Dom ..6=Sab (using JS getDay: 0=Dom)
  remindBefore: number;
  reminder: string; // ISO datetime "YYYY-MM-DDTHH:mm"
  reminded: boolean;
  quadrant: Quadrant;
  pomo: number;
  pomodoroBlocks: PomodoroBlock[];
  done: boolean;
  deleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  tags: string[];
}

export interface TaskList {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  best?: number;
  days: number[]; // 7 length 0/1
  history: Record<string, number>;
  week: string; // YYYY-WNN
  notify: boolean;
  notifyTime: string;
  lastPing: string;
}

export interface Countdown {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  created: number;
}

export interface PomoLogEntry {
  id: string;
  date: string;
  ts: number;
  mode: "focus" | "break";
  minutes: number;
  task: string | null;
}

export type NotificationKind = "system" | "calendar" | "reminder";

export interface CreekyNotification {
  id: string;
  title: string;
  text: string;
  time: string;
  unread: boolean;
  kind: NotificationKind;
}

export interface User {
  id: string;
  name: string;
  email: string;
  pass: string; // btoa
  created: number;
}

export interface CreekyDB {
  users: User[];
  session: string | null;
  tags: string[];
  tasks: Task[];
  lists: TaskList[];
  habits: Habit[];
  matrix: Record<"q1" | "q2" | "q3" | "q4", string[]>;
  countdowns: Countdown[];
  pomoLog: PomoLogEntry[];
  notifications: CreekyNotification[];
}

export const APP_VERSION = "31";

export const DEFAULT_TAGS: string[] = ["trabajo", "personal", "urgente"];

export const PRIO_META: Record<Priority, { mark: string; label: string; color: string }> = {
  high: { mark: "!", label: "¡Alta!", color: "#C62828" },
  medium: { mark: "!", label: "¡Media!", color: "#B58900" },
  low: { mark: "!", label: "¡Baja!", color: "#2E7D32" },
  none: { mark: "○", label: "Ninguna", color: "#9E9E9E" },
};

export const Q_PRIO: Record<"q1" | "q2" | "q3" | "q4", Priority> = {
  q1: "high",
  q2: "medium",
  q3: "low",
  q4: "none",
};

export const REMIND_OPTIONS: { v: number; label: string }[] = [
  { v: 0, label: "Sin aviso" },
  { v: 5, label: "5 min antes" },
  { v: 15, label: "15 min antes" },
  { v: 30, label: "30 min antes" },
  { v: 60, label: "1 hora antes" },
  { v: 1440, label: "1 día antes" },
];

export const EMOJI_GRID: { cat: string; items: string[] }[] = [
  { cat: "Caras y gestos", items: ["😀","😁","😂","🤣","😊","😍","😎","🤔","😴","😷","🤯","🥳","😭","😡","👋","👍","👎","👏","🙌","💪","🤝","👀","🧠","❤️","💯"] },
  { cat: "Trabajo y hogar", items: ["📋","📥","💼","🏠","📚","🛒","💰","🎓","🏥","🧹","🔧","🔑","🖨️","📱","💻","⏰","🔔"] },
  { cat: "Lugares y viajes", items: ["✈️","🚗","🚲","🏖️","🏔️","🗺️","🏙️","🚂","⛵"] },
  { cat: "Naturaleza", items: ["🌱","🌳","🌸","☀️","🌙","⭐","🔥","💧","🌈","❄️","🌊","🍀"] },
  { cat: "Comida", items: ["🍎","🍕","☕","🍰","🍔","🥗","🍩","🧃","🍇","🥑"] },
  { cat: "Actividades", items: ["⚽","🏀","🎮","🎨","🎵","📖","✏️","🎬","🏋️","🧘","🎲","🎸"] },
  { cat: "Ideas y metas", items: ["💡","🎯","🚀","🌟","✅","❌","❗","❓","💤","🏆","📌","📈"] },
];

export const WEEKDAYS: { v: number; label: string }[] = [
  { v: 1, label: "L" }, { v: 2, label: "M" }, { v: 3, label: "X" },
  { v: 4, label: "J" }, { v: 5, label: "V" }, { v: 6, label: "S" }, { v: 0, label: "D" },
];
