import type { MessageKey } from "@/i18n/locales/es";

/**
 * Task priority level.
 */
export type Priority = "high" | "medium" | "low" | "none";

/**
 * Eisenhower quadrant, or an empty string when unassigned.
 */
export type Quadrant = "q1" | "q2" | "q3" | "q4" | "";

/**
 * Color theme of the interface.
 */
export type Theme = "light" | "dark";

/**
 * Interface language.
 */
export type Language = "es" | "en";

/**
 * Planned focus or break block reserved for a task.
 */
export interface PomodoroBlock {
  /** Kind of block. */
  type: "focus" | "shortBreak" | "longBreak";
  /** Length in minutes. */
  duration: number;
}

/**
 * Task with scheduling, reminder and Pomodoro data.
 */
export interface Task {
  /** Stable identifier. */
  id: string;
  /** Task title. */
  title: string;
  /** Free-form details. */
  description: string;
  /** Identifier of the list that owns the task. */
  list: string;
  /** Priority level. */
  priority: Priority;
  /** Due date as YYYY-MM-DD, or empty. */
  due: string;
  /** Due time as HH:mm, or empty. */
  dueTime: string;
  /** Planned length in minutes. */
  duration: number;
  /** Weekdays on which the task repeats, 0 for Sunday through 6 for Saturday. */
  repeat: number[];
  /** Minutes before the due time at which to remind. */
  remindBefore: number;
  /** Reminder moment as YYYY-MM-DDTHH:mm, or empty. */
  reminder: string;
  /** Whether the reminder already fired. */
  reminded: boolean;
  /** Manually assigned quadrant. */
  quadrant: Quadrant;
  /** Completed Pomodoro focus sessions. */
  pomo: number;
  /** Reserved Pomodoro blocks. */
  pomodoroBlocks: PomodoroBlock[];
  /** Whether the task is completed. */
  done: boolean;
  /** Whether the task is in the trash. */
  deleted: boolean;
  /** Epoch millis when the task was trashed. */
  deletedAt: number | null;
  /** Epoch millis when the task was created. */
  createdAt: number;
  /** Names of the attached tags. */
  tags: string[];
}

/**
 * List that groups tasks.
 */
export interface TaskList {
  /** Stable identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Short description. */
  description: string;
  /** Accent color as a hex value. */
  color: string;
  /** Emoji shown next to the name. */
  icon: string;
}

/**
 * Daily habit with its weekly progress.
 */
export interface Habit {
  /** Stable identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Consecutive completed days up to today. */
  streak: number;
  /** Longest streak reached. */
  best?: number;
  /** Completion flags for the current week, Monday first. */
  days: number[];
  /** Completed days keyed by ISO date. */
  history: Record<string, number>;
  /** Current ISO week as YYYY-Wnn. */
  week: string;
  /** Whether the daily reminder is enabled. */
  notify: boolean;
  /** Reminder time as HH:mm. */
  notifyTime: string;
  /** ISO date of the last reminder sent. */
  lastPing: string;
}

/**
 * Manual countdown towards a target date.
 */
export interface Countdown {
  /** Stable identifier. */
  id: string;
  /** Event title. */
  title: string;
  /** Target date as YYYY-MM-DD. */
  date: string;
  /** Epoch millis when the countdown was created. */
  created: number;
}

/**
 * Finished Pomodoro session.
 */
export interface PomoLogEntry {
  /** Stable identifier. */
  id: string;
  /** Session date as YYYY-MM-DD. */
  date: string;
  /** Epoch millis when the session ended. */
  ts: number;
  /** Kind of session. */
  mode: "focus" | "break";
  /** Length in minutes. */
  minutes: number;
  /** Title of the focused task, when any. */
  task: string | null;
}

/**
 * Category of an in-app notification.
 */
export type NotificationKind = "system" | "calendar" | "reminder";

/**
 * In-app notification.
 */
export interface CreekyNotification {
  /** Stable identifier. */
  id: string;
  /** Notification title. */
  title: string;
  /** Notification body. */
  text: string;
  /** Epoch millis when the notification was created. */
  createdAt: number;
  /** Whether the notification is still unread. */
  unread: boolean;
  /** Notification category. */
  kind: NotificationKind;
}

/**
 * Signed-in account. The password never leaves the backend.
 */
export interface User {
  /** Stable identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Email address. */
  email: string;
  /** Epoch millis when the account was created. */
  created: number;
  /** Profile photo as a data URL. */
  avatar?: string | null;
}

/**
 * Email address linked to a provider for sending backups.
 */
export interface EmailLink {
  /** Linked provider. */
  provider: "gmail" | "outlook" | "apple";
  /** User's address for that provider. */
  email: string;
  /** Epoch millis when the link was created. */
  linkedAt: number;
  /** Epoch millis of the last backup sent, when any. */
  lastSentAt?: number | null;
}

/**
 * Task focused in the Pomodoro view.
 */
export interface FocusPayload {
  /** Task identifier. */
  id: string;
  /** Task title at the time it was focused. */
  title: string;
}

/**
 * Full application state served by the backend.
 */
export interface CreekyDB {
  /** Signed-in user, when any. */
  user: User | null;
  /** Known tag names. */
  tags: string[];
  /** Every task, including trashed ones. */
  tasks: Task[];
  /** Task lists. */
  lists: TaskList[];
  /** Tracked habits. */
  habits: Habit[];
  /** Manual Eisenhower notes per quadrant. */
  matrix: Record<"q1" | "q2" | "q3" | "q4", string[]>;
  /** Manual countdowns. */
  countdowns: Countdown[];
  /** Pomodoro history, newest first. */
  pomoLog: PomoLogEntry[];
  /** In-app notifications, newest first. */
  notifications: CreekyNotification[];
  /** Linked email providers. */
  emailLinks: EmailLink[];
  /** Task focused in the Pomodoro view. */
  focus: FocusPayload | null;
  /** Stored preferences. */
  settings: { theme: Theme; language: Language };
}

/**
 * Application version shown in the interface.
 */
export const APP_VERSION = "31";

/**
 * Visual metadata for each priority level.
 */
export const PRIO_META: Record<Priority, { mark: string; labelKey: MessageKey; color: string }> = {
  high: { mark: "!", labelKey: "priority.high", color: "#C62828" },
  medium: { mark: "!", labelKey: "priority.medium", color: "#B58900" },
  low: { mark: "!", labelKey: "priority.low", color: "#2E7D32" },
  none: { mark: "○", labelKey: "priority.none", color: "#9E9E9E" },
};

/**
 * Priority assigned to tasks dropped on each Eisenhower quadrant.
 */
export const Q_PRIO: Record<"q1" | "q2" | "q3" | "q4", Priority> = {
  q1: "high",
  q2: "medium",
  q3: "low",
  q4: "none",
};

/**
 * Reminder lead times offered when scheduling a task.
 */
export const REMIND_OPTIONS: { v: number; labelKey: MessageKey }[] = [
  { v: 0, labelKey: "remind.none" },
  { v: 5, labelKey: "remind.5" },
  { v: 15, labelKey: "remind.15" },
  { v: 30, labelKey: "remind.30" },
  { v: 60, labelKey: "remind.60" },
  { v: 1440, labelKey: "remind.1440" },
];

/**
 * Curated emoji shortcuts offered for list icons.
 */
export const EMOJI_GRID: { catKey: MessageKey; items: string[] }[] = [
  { catKey: "emoji.faces", items: ["😀","😁","😂","🤣","😊","😍","😎","🤔","😴","😷","🤯","🥳","😭","😡","👋","👍","👎","👏","🙌","💪","🤝","👀","🧠","❤️","💯"] },
  { catKey: "emoji.work", items: ["📋","📥","💼","🏠","📚","🛒","💰","🎓","🏥","🧹","🔧","🔑","🖨️","📱","💻","⏰","🔔"] },
  { catKey: "emoji.places", items: ["✈️","🚗","🚲","🏖️","🏔️","🗺️","🏙️","🚂","⛵"] },
  { catKey: "emoji.nature", items: ["🌱","🌳","🌸","☀️","🌙","⭐","🔥","💧","🌈","❄️","🌊","🍀"] },
  { catKey: "emoji.food", items: ["🍎","🍕","☕","🍰","🍔","🥗","🍩","🧃","🍇","🥑"] },
  { catKey: "emoji.activities", items: ["⚽","🏀","🎮","🎨","🎵","📖","✏️","🎬","🏋️","🧘","🎲","🎸"] },
  { catKey: "emoji.ideas", items: ["💡","🎯","🚀","🌟","✅","❌","❗","❓","💤","🏆","📌","📈"] },
];

/**
 * Default icon for lists without an emoji.
 */
export const DEFAULT_LIST_ICON = "📋";

/**
 * Weekdays in display order, using 0 for Sunday through 6 for Saturday.
 */
export const WEEKDAYS: { v: number; labelKey: MessageKey }[] = [
  { v: 1, labelKey: "weekday.short.1" },
  { v: 2, labelKey: "weekday.short.2" },
  { v: 3, labelKey: "weekday.short.3" },
  { v: 4, labelKey: "weekday.short.4" },
  { v: 5, labelKey: "weekday.short.5" },
  { v: 6, labelKey: "weekday.short.6" },
  { v: 0, labelKey: "weekday.short.0" },
];
