import type {
  Countdown,
  CreekyDB,
  CreekyNotification,
  EmailLink,
  FocusPayload,
  Habit,
  Language,
  NotificationCategory,
  PomoLogEntry,
  Quadrant,
  Task,
  TaskList,
  Theme,
  UnadAccount,
  UnadAgenda,
  UnadState,
  User,
} from "@/types/creeky";

/**
 * Result envelope returned by every data method of the bridge.
 */
export type BridgeResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Fields accepted when creating or updating a task.
 */
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "deletedAt">>;

/**
 * Fields accepted when creating or updating a task list.
 */
export type TaskListPatch = Partial<Omit<TaskList, "id">>;

/**
 * Manual Eisenhower note addressed by quadrant.
 */
export interface MatrixNoteInput {
  /** Quadrant that receives the note. */
  quadrant: Exclude<Quadrant, "">;
  /** Note text. */
  text: string;
}

/**
 * Notification produced by a frontend action.
 */
export type NotificationInput = Pick<CreekyNotification, "title" | "text" | "kind">;

/**
 * Outcome of recording a Pomodoro session.
 */
export interface PomodoroLogResult {
  /** Stored session. */
  session: PomoLogEntry;
  /** Task credited with the session, when any. */
  task: { id: string; title: string; pomo: number } | null;
}

/**
 * Window size in logical pixels.
 */
export interface WindowSize {
  /** Window width. */
  width: number;
  /** Window height. */
  height: number;
}

/**
 * Outcome of exporting an encrypted backup.
 */
export type BackupExportResult =
  | { cancelled: true }
  | {
      cancelled: false;
      /** Path of the written file. */
      path: string;
      /** File size in bytes. */
      size: number;
      /** Recovery key shown once to the user. */
      key: string;
    };

/**
 * Outcome of importing an encrypted backup.
 */
export type BackupImportResult = { cancelled: true } | { cancelled: false; tasks: number };

/**
 * Startup behavior preferences.
 */
export interface StartupOptions {
  /** Whether the app opens hidden in the tray when Windows signs in. */
  startMinimized: boolean;
  /** Whether closing the window keeps the app running in the tray. */
  minimizeOnClose: boolean;
}

/**
 * Methods exposed by the Python backend through pywebview.
 */
export interface CreekyBridgeApi {
  ping(): Promise<string>;
  minimize_window(): Promise<void>;
  close_window(): Promise<void>;
  get_window_sizes(): Promise<BridgeResult<{ options: WindowSize[]; current: WindowSize }>>;
  set_window_size(width: number, height: number): Promise<BridgeResult<WindowSize>>;
  get_theme(): Promise<{ theme: Theme }>;
  get_snapshot(): Promise<BridgeResult<CreekyDB>>;
  export_backup(): Promise<BridgeResult<BackupExportResult>>;
  import_backup(recoveryKey: string): Promise<BridgeResult<BackupImportResult>>;
  set_sidebar_collapsed(collapsed: boolean): Promise<BridgeResult<{ collapsed: boolean }>>;
  get_autostart(): Promise<BridgeResult<{ enabled: boolean }>>;
  set_autostart(enabled: boolean): Promise<BridgeResult<{ enabled: boolean }>>;
  get_startup_options(): Promise<BridgeResult<StartupOptions>>;
  set_start_minimized(enabled: boolean): Promise<BridgeResult<{ startMinimized: boolean }>>;
  set_minimize_on_close(enabled: boolean): Promise<BridgeResult<{ minimizeOnClose: boolean }>>;
  get_pomodoro_alarm(): Promise<BridgeResult<{ enabled: boolean; volume: number; sound: string; repeat: boolean; repeatCount: number; repeatDuration: number }>>;
  set_pomodoro_alarm_enabled(enabled: boolean): Promise<BridgeResult<{ enabled: boolean }>>;
  set_pomodoro_alarm_volume(volume: number): Promise<BridgeResult<{ volume: number }>>;
  set_pomodoro_alarm_sound(sound: string): Promise<BridgeResult<{ sound: string }>>;
  set_pomodoro_alarm_repeat(enabled: boolean): Promise<BridgeResult<{ repeat: boolean }>>;
  set_pomodoro_alarm_repeat_count(count: number): Promise<BridgeResult<{ repeatCount: number }>>;
  set_pomodoro_alarm_repeat_duration(seconds: number): Promise<BridgeResult<{ repeatDuration: number }>>;
  list_sounds(): Promise<BridgeResult<{ name: string; label: string; trimStart: number; trimEnd: number; builtin: boolean }[]>>;
  get_sound_data_url(name: string): Promise<BridgeResult<{ dataUrl: string; trimStart: number; trimEnd: number }>>;
  pick_sound(): Promise<BridgeResult<{ cancelled: true } | { cancelled: false; name: string; label: string; trimStart: number; trimEnd: number }>>;
  set_sound_trim(name: string, trimStart: number, trimEnd: number): Promise<BridgeResult<{ name: string; trimStart: number; trimEnd: number }>>;
  rename_sound(name: string, label: string): Promise<BridgeResult<{ name: string; label: string }>>;
  delete_sound(name: string): Promise<BridgeResult<{ deleted: boolean }>>;
  set_onboarded(onboarded: boolean): Promise<BridgeResult<User>>;
  set_notification_preference(category: NotificationCategory, enabled: boolean): Promise<BridgeResult<Record<NotificationCategory, boolean>>>;
  unad_connect(documentType: string, document: string, password: string): Promise<BridgeResult<UnadState>>;
  unad_disconnect(): Promise<BridgeResult<null>>;
  unad_update_settings(patch: Partial<Pick<UnadAccount, "enabled" | "intervalMinutes" | "deadlineDays">>): Promise<BridgeResult<UnadState>>;
  unad_add_agenda(url: string): Promise<BridgeResult<UnadAgenda>>;
  unad_remove_agenda(agendaId: string): Promise<BridgeResult<null>>;
  unad_sync_now(): Promise<BridgeResult<{ error: string; agendas: number }>>;
  wipe_data(): Promise<BridgeResult<null>>;
  set_theme(theme: Theme): Promise<BridgeResult<{ theme: Theme }>>;
  set_language(language: Language): Promise<BridgeResult<{ language: Language }>>;
  set_focus(focus: FocusPayload | null): Promise<BridgeResult<null>>;
  sign_up(name: string, email: string, password: string): Promise<BridgeResult<User>>;
  sign_in(email: string, password: string): Promise<BridgeResult<User>>;
  sign_out(): Promise<BridgeResult<null>>;
  update_profile(name: string, email: string, password: string | null): Promise<BridgeResult<User>>;
  pick_avatar(): Promise<BridgeResult<{ cancelled: true } | { cancelled: false; user: User }>>;
  pick_avatar_raw(): Promise<BridgeResult<{ cancelled: true } | { cancelled: false; dataUrl: string }>>;
  set_avatar(dataUrl: string): Promise<BridgeResult<User>>;
  get_avatar(): Promise<BridgeResult<{ dataUrl: string | null }>>;
  remove_avatar(): Promise<BridgeResult<User>>;
  create_task(payload: TaskPatch): Promise<BridgeResult<Task>>;
  update_task(taskId: string, patch: TaskPatch): Promise<BridgeResult<Task>>;
  delete_task(taskId: string): Promise<BridgeResult<null>>;
  empty_trash(): Promise<BridgeResult<number>>;
  create_list(payload: TaskListPatch): Promise<BridgeResult<TaskList>>;
  update_list(listId: string, patch: TaskListPatch): Promise<BridgeResult<TaskList>>;
  delete_list(listId: string): Promise<BridgeResult<number>>;
  create_tag(name: string): Promise<BridgeResult<string>>;
  rename_tag(name: string, newName: string): Promise<BridgeResult<{ name: string; merged: boolean }>>;
  delete_tag(name: string): Promise<BridgeResult<null>>;
  delete_unused_tags(): Promise<BridgeResult<number>>;
  create_habit(name: string): Promise<BridgeResult<Habit>>;
  update_habit(habitId: string, patch: Partial<Pick<Habit, "name" | "notify" | "notifyTime">>): Promise<BridgeResult<Habit>>;
  toggle_habit_day(habitId: string, day: string): Promise<BridgeResult<Habit>>;
  delete_habit(habitId: string): Promise<BridgeResult<null>>;
  add_matrix_notes(notes: MatrixNoteInput[], skipExisting: boolean): Promise<BridgeResult<number>>;
  delete_matrix_note(quadrant: string, index: number): Promise<BridgeResult<null>>;
  move_matrix_note(quadrant: string, index: number, target: string): Promise<BridgeResult<null>>;
  create_countdown(title: string, date: string): Promise<BridgeResult<Countdown>>;
  update_countdown(countdownId: string, title: string, date: string): Promise<BridgeResult<Countdown>>;
  delete_countdown(countdownId: string): Promise<BridgeResult<null>>;
  log_pomodoro_session(mode: "focus" | "break", minutes: number, taskId: string | null, taskTitle: string | null): Promise<BridgeResult<PomodoroLogResult>>;
  delete_pomodoro_session(sessionId: string): Promise<BridgeResult<null>>;
  create_notifications(items: NotificationInput[]): Promise<BridgeResult<number>>;
  mark_notification_read(notificationId: string): Promise<BridgeResult<null>>;
  mark_all_notifications_read(): Promise<BridgeResult<null>>;
  save_email_link(provider: string, email: string): Promise<BridgeResult<EmailLink>>;
  delete_email_link(provider: string): Promise<BridgeResult<null>>;
  mark_email_link_sent(provider: string): Promise<BridgeResult<null>>;
}

/**
 * Event published by the backend on the shared pywebview state.
 */
export interface BackendEventMessage {
  /** Monotonic sequence number. */
  id: number;
  /** Event name, such as `data:changed`. */
  name: string;
  /** Data delivered with the event. */
  payload: Record<string, unknown>;
}

/**
 * Shared state object synchronized by pywebview. It dispatches `change`
 * events whenever the backend updates one of its keys.
 */
export interface PywebviewState extends EventTarget {
  /** Latest event published by the backend. */
  creeky_event?: BackendEventMessage;
}

declare global {
  interface Window {
    pywebview?: {
      api: CreekyBridgeApi;
      state?: PywebviewState;
    };
  }
}

export {};
