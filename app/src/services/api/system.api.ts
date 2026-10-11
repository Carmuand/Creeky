import { bridge, mutate, query } from "./bridge";
import type { CreekyDB, EmailLink, FocusPayload, Language, NotificationCategory, Theme } from "@/types/creeky";
import type { BackupExportResult, BackupImportResult, NotificationInput } from "@/types/pywebview";

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
