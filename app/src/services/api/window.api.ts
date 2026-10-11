import { bridge, query } from "./bridge";
import type { WindowSize } from "@/types/pywebview";

export type { WindowSize };

/**
 * Sizes reported by the backend with the one in use.
 */
export interface WindowSizes {
  /** Sizes that fit the current monitor. */
  options: WindowSize[];
  /** Size currently stored. */
  current: WindowSize;
}

/**
 * Window control calls.
 */
export const windowApi = {
  /**
   * Minimizes the application window.
   *
   * @returns Promise resolved once the request is sent.
   */
  minimizeWindow(): Promise<void> { return bridge().minimize_window(); },

  /**
   * Closes the application window.
   *
   * @returns Promise resolved once the request is sent.
   */
  closeWindow(): Promise<void> { return bridge().close_window(); },

  /**
   * Checks that the backend answers.
   *
   * @returns The backend reply.
   */
  ping(): Promise<string> { return bridge().ping(); },

  /**
   * Lists the window sizes that fit the current monitor.
   *
   * @returns Available options with the current size.
   */
  getWindowSizes(): Promise<WindowSizes> { return query(bridge().get_window_sizes()); },

  /**
   * Resizes the window to an allowed size and persists it.
   *
   * @param width - Width of the chosen size.
   * @param height - Height of the chosen size.
   * @returns The applied size.
   */
  setWindowSize(width: number, height: number): Promise<WindowSize> {
    return query(bridge().set_window_size(width, height));
  },
};
