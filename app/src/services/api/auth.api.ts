import { bridge, mutate } from "./bridge";
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
   * Sets or removes the photo of the signed-in user.
   *
   * @param dataUrl - Photo as a data URL, or null to remove it.
   * @returns The updated user.
   */
  setAvatar(dataUrl: string | null): Promise<User> { return mutate(bridge().set_avatar(dataUrl)); },

  /**
   * Records whether the signed-in user finished or skipped the guided tour.
   *
   * @param onboarded - False to show the tour again.
   * @returns The updated user.
   */
  setOnboarded(onboarded: boolean): Promise<User> { return mutate(bridge().set_onboarded(onboarded)); },
};
