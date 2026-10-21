import { bridge, mutate, query } from "./bridge";
import type { CreekyDB, EmailLink, FocusPayload, Language, NotificationCategory, Theme } from "@/types/creeky";
import type { BackupExportResult, BackupImportResult, NotificationInput, StartupOptions } from "@/types/pywebview";

/**
 * Snapshot, backup and wipe calls.
 */
export const dataApi = {
  /**
   * Loads the full application state.
   *
   * @returns The current snapshot.
   */
  getSnapshot(): Promise<CreekyDB> { return query(bridge().get_snapshot()); },

  /**
   * Saves an encrypted backup through a native dialog.
   *
   * @returns The file path with its one-time recovery key, or a cancelled result.
   */
  exportBackup(): Promise<BackupExportResult> { return query(bridge().export_backup()); },

  /**
   * Restores an encrypted backup chosen through a native dialog.
   *
   * @param recoveryKey - Key received when the backup was exported.
   * @returns The number of imported tasks, or a cancelled result.
   */
  importBackup(recoveryKey: string): Promise<BackupImportResult> { return mutate(bridge().import_backup(recoveryKey)); },

  /**
   * Deletes the signed-in account with its data and credentials.
   *
   * @returns Promise resolved once the account is deleted.
   */
  wipe(): Promise<null> { return mutate(bridge().wipe_data()); },
};

/**
 * Preference calls.
 */
export const settingsApi = {
  /**
   * Persists the active theme.
   *
   * @param theme - Theme to store.
   * @returns The stored theme.
   */
  setTheme(theme: Theme): Promise<{ theme: Theme }> { return query(bridge().set_theme(theme)); },

  /**
   * Persists the active language.
   *
   * @param language - Language to store.
   * @returns The stored language.
   */
  setLanguage(language: Language): Promise<{ language: Language }> { return mutate(bridge().set_language(language)); },

  /**
   * Persists whether the sidebar is collapsed.
   *
   * @param collapsed - Sidebar state to store.
   * @returns The stored state.
   */
  setSidebarCollapsed(collapsed: boolean): Promise<{ collapsed: boolean }> { return query(bridge().set_sidebar_collapsed(collapsed)); },

  /**
   * Tells whether the application starts with Windows.
   *
   * @returns The current state.
   */
  getAutostart(): Promise<{ enabled: boolean }> { return query(bridge().get_autostart()); },

  /**
   * Registers or unregisters the application to start with Windows.
   *
   * @param enabled - Whether it should start at sign-in.
   * @returns The resulting state.
   */
  setAutostart(enabled: boolean): Promise<{ enabled: boolean }> { return query(bridge().set_autostart(enabled)); },

  /**
   * Loads the Pomodoro alarm preferences.
   *
   * @returns Stored alarm preferences.
   */
  getPomodoroAlarm(): Promise<{ enabled: boolean; volume: number; sound: string; repeat: boolean; repeatCount: number; repeatDuration: number }> {
    return query(bridge().get_pomodoro_alarm());
  },

  /**
   * Persists whether the Pomodoro alarm plays on session completion.
   *
   * @param enabled - Whether the alarm is enabled.
   * @returns The stored state.
   */
  setPomodoroAlarmEnabled(enabled: boolean): Promise<{ enabled: boolean }> {
    return query(bridge().set_pomodoro_alarm_enabled(enabled));
  },

  /**
   * Persists the Pomodoro alarm volume.
   *
   * @param volume - Volume from 0 to 100.
   * @returns The stored volume.
   */
  setPomodoroAlarmVolume(volume: number): Promise<{ volume: number }> {
    return query(bridge().set_pomodoro_alarm_volume(volume));
  },

  /**
   * Persists the file name of the Pomodoro alarm sound.
   *
   * @param sound - Sound file name.
   * @returns The stored sound.
   */
  setPomodoroAlarmSound(sound: string): Promise<{ sound: string }> {
    return query(bridge().set_pomodoro_alarm_sound(sound));
  },

  setPomodoroAlarmRepeat(enabled: boolean): Promise<{ repeat: boolean }> {
    return query(bridge().set_pomodoro_alarm_repeat(enabled));
  },

  setPomodoroAlarmRepeatCount(count: number): Promise<{ repeatCount: number }> {
    return query(bridge().set_pomodoro_alarm_repeat_count(count));
  },

  setPomodoroAlarmRepeatDuration(seconds: number): Promise<{ repeatDuration: number }> {
    return query(bridge().set_pomodoro_alarm_repeat_duration(seconds));
  },

  /**
   * Loads the startup behavior preferences.
   *
   * @returns Stored startup options.
   */
  getStartupOptions(): Promise<StartupOptions> { return query(bridge().get_startup_options()); },

  /**
   * Persists whether the app should start hidden with Windows.
   *
   * @param enabled - Whether it should start minimized at sign-in.
   * @returns The stored state.
   */
  setStartMinimized(enabled: boolean): Promise<{ startMinimized: boolean }> {
    return query(bridge().set_start_minimized(enabled));
  },

  /**
   * Persists whether closing the window keeps the app in the tray.
   *
   * @param enabled - Whether closing should hide the window to the tray.
   * @returns The stored state.
   */
  setMinimizeOnClose(enabled: boolean): Promise<{ minimizeOnClose: boolean }> {
    return query(bridge().set_minimize_on_close(enabled));
  },

  /**
   * Persists or clears the Pomodoro focus task.
   *
   * @param focus - Task to focus, or null to clear it.
   * @returns Promise resolved once the focus is stored.
   */
  setFocus(focus: FocusPayload | null): Promise<null> { return mutate(bridge().set_focus(focus)); },
};

/**
 * In-app notification calls.
 */
export const notificationsApi = {
  /**
   * Stores notifications produced by frontend actions.
   *
   * @param items - Notifications to store.
   * @returns Number of notifications stored.
   */
  create(items: NotificationInput[]): Promise<number> { return mutate(bridge().create_notifications(items)); },

  /**
   * Turns the desktop notifications of a category on or off.
   *
   * @param category - Category to change; `desktop` is the master switch.
   * @param enabled - Whether desktop notifications are shown.
   * @returns Every switch after the change.
   */
  setPreference(category: NotificationCategory, enabled: boolean): Promise<Record<NotificationCategory, boolean>> { return mutate(bridge().set_notification_preference(category, enabled)); },

  /**
   * Marks one notification as read.
   *
   * @param id - Notification identifier.
   * @returns Promise resolved once the notification is updated.
   */
  markRead(id: string): Promise<null> { return mutate(bridge().mark_notification_read(id)); },

  /**
   * Marks every notification as read.
   *
   * @returns Promise resolved once the notifications are updated.
   */
  markAllRead(): Promise<null> { return mutate(bridge().mark_all_notifications_read()); },
};

/**
 * Linked email provider calls.
 */
export const emailLinksApi = {
  /**
   * Links an email address to a provider.
   *
   * @param provider - Provider identifier.
   * @param email - Address to link.
   * @returns The stored link.
   */
  save(provider: string, email: string): Promise<EmailLink> { return mutate(bridge().save_email_link(provider, email)); },

  /**
   * Unlinks a provider.
   *
   * @param provider - Provider identifier.
   * @returns Promise resolved once the link is removed.
   */
  remove(provider: string): Promise<null> { return mutate(bridge().delete_email_link(provider)); },

  /**
   * Records that a backup was sent through a provider.
   *
   * @param provider - Provider identifier.
   * @returns Promise resolved once the link is updated.
   */
  markSent(provider: string): Promise<null> { return mutate(bridge().mark_email_link_sent(provider)); },
};

/**
 * Sound storage and playback calls.
 */
export const soundsApi = {
  /**
   * Lists the available alarm sounds.
   *
   * @returns Available sounds.
   */
  list(): Promise<{ name: string; label: string; trimStart: number; trimEnd: number; builtin: boolean }[]> { return query(bridge().list_sounds()); },

  /**
   * Loads a sound as a data URL for playback.
   *
   * @param name - Sound file name.
   * @returns The data URL.
   */
  getDataUrl(name: string): Promise<{ dataUrl: string; trimStart: number; trimEnd: number }> { return query(bridge().get_sound_data_url(name)); },

  /**
   * Lets the user import an audio file through a native dialog.
   *
   * @returns The stored file name, or a cancelled result.
   */
  pick(): Promise<{ cancelled: true } | { cancelled: false; name: string; label: string; trimStart: number; trimEnd: number }> {
    return query(bridge().pick_sound());
  },

  /**
   * Renames the display label of an imported sound.
   *
   * @param name - Sound file name.
   * @param label - New display label.
   * @returns The updated sound.
   */
  rename(name: string, label: string): Promise<{ name: string; label: string }> {
    return query(bridge().rename_sound(name, label));
  },

  /**
   * Persists the trim range of an imported sound.
   *
   * @param name - Sound file name.
   * @param trimStart - Trim start in seconds.
   * @param trimEnd - Trim end in seconds (0 means the full sound).
   * @returns The updated sound.
   */
  setTrim(name: string, trimStart: number, trimEnd: number): Promise<{ name: string; trimStart: number; trimEnd: number }> {
    return query(bridge().set_sound_trim(name, trimStart, trimEnd));
  },

  /**
   * Deletes an imported sound.
   *
   * @param name - Sound file name.
   * @returns The deletion result.
   */
  delete(name: string): Promise<{ deleted: boolean }> {
    return query(bridge().delete_sound(name));
  },
};
