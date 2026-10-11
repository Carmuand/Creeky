import { bridge, mutate, query } from "./bridge";
import type { CreekyDB, EmailLink, FocusPayload, Language, Theme } from "@/types/creeky";
import type { NotificationInput } from "@/types/pywebview";

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
   * Replaces the stored collections with a JSON backup.
   *
   * @param data - Parsed backup file.
   * @returns Promise resolved once the backup is imported.
   */
  importBackup(data: unknown): Promise<null> { return mutate(bridge().import_backup(data)); },

  /**
   * Deletes every account, credential and record.
   *
   * @returns Promise resolved once the data is wiped.
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
