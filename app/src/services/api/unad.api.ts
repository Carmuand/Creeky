import { bridge, mutate } from "./bridge";
import type { UnadAccount, UnadAgenda, UnadState } from "@/types/creeky";

/**
 * UNAD Campus integration calls.
 */
export const unadApi = {
  /**
   * Verifies the campus credentials and links the account. The backend
   * signs in, reads the profile and starts the synchronization service.
   *
   * @param documentType - Document type code, such as CC.
   * @param document - Document number.
   * @param password - Campus password, kept in the system credential manager.
   * @returns The UNAD state of the user.
   */
  connect(documentType: string, document: string, password: string): Promise<UnadState> { return mutate(bridge().unad_connect(documentType, document, password)); },

  /**
   * Unlinks the campus account with its agendas and stored password.
   *
   * @returns Promise resolved once the account is unlinked.
   */
  disconnect(): Promise<null> { return mutate(bridge().unad_disconnect()); },

  /**
   * Changes the service switch, the sync interval or the deadline lead time.
   *
   * @param patch - Settings to change.
   * @returns The UNAD state of the user.
   */
  updateSettings(patch: Partial<Pick<UnadAccount, "enabled" | "intervalMinutes" | "deadlineDays">>): Promise<UnadState> { return mutate(bridge().unad_update_settings(patch)); },

  /**
   * Follows a course agenda and downloads it right away.
   *
   * @param url - Agenda page URL ending in `<code>.htm`.
   * @returns The stored agenda.
   */
  addAgenda(url: string): Promise<UnadAgenda> { return mutate(bridge().unad_add_agenda(url)); },

  /**
   * Stops following a course agenda.
   *
   * @param agendaId - Agenda identifier.
   * @returns Promise resolved once the agenda is removed.
   */
  removeAgenda(agendaId: string): Promise<null> { return mutate(bridge().unad_remove_agenda(agendaId)); },

  /**
   * Synchronizes the profile and the agendas immediately.
   *
   * @returns The error code of the run, empty on success, and the agendas refreshed.
   */
  syncNow(): Promise<{ error: string; agendas: number }> { return mutate(bridge().unad_sync_now()); },
};
