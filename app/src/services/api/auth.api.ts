import { bridge, mutate, query } from "./bridge";
import type { User } from "@/types/creeky";

/**
 * Authentication and profile calls.
 */
export const authApi = {
  /**
   * Creates an account and starts a session.
   *
   * @param name - Display name.
   * @param email - Email address.
   * @param password - Plain password, hashed by the backend.
   * @returns The created user.
   */
  signUp(name: string, email: string, password: string): Promise<User> { return mutate(bridge().sign_up(name, email, password)); },

  /**
   * Verifies the credentials and starts a session.
   *
   * @param email - Email address.
   * @param password - Plain password.
   * @returns The signed-in user.
   */
  signIn(email: string, password: string): Promise<User> { return mutate(bridge().sign_in(email, password)); },

  /**
   * Ends the active session.
   *
   * @returns Promise resolved once the session is closed.
   */
  signOut(): Promise<null> { return mutate(bridge().sign_out()); },

  /**
   * Updates the profile of the signed-in user.
   *
   * @param name - New display name.
   * @param email - New email address.
   * @param password - New password, or null to keep the current one.
   * @returns The updated user.
   */
  updateProfile(name: string, email: string, password: string | null): Promise<User> { return mutate(bridge().update_profile(name, email, password)); },

  /**
   * Opens a native dialog to choose a profile photo, which the backend
   * validates and stores as a file of the signed-in user.
   *
   * @returns True when a photo was stored, false when the dialog was cancelled.
   */
  async pickAvatar(): Promise<boolean> {
    const result = await mutate(bridge().pick_avatar());
    return !result.cancelled;
  },

  /**
   * Loads the profile photo of the signed-in user.
   *
   * @returns The photo as a data URL, or null when there is none.
   */
  async getAvatar(): Promise<string | null> {
    return (await query(bridge().get_avatar())).dataUrl;
  },

  /**
   * Removes the profile photo of the signed-in user.
   *
   * @returns The updated user.
   */
  removeAvatar(): Promise<User> { return mutate(bridge().remove_avatar()); },

  /**
   * Records whether the signed-in user finished or skipped the guided tour.
   *
   * @param onboarded - False to show the tour again.
   * @returns The updated user.
   */
  setOnboarded(onboarded: boolean): Promise<User> { return mutate(bridge().set_onboarded(onboarded)); },
};
