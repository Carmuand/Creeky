import { useCallback, useSyncExternalStore } from "react";
import { isBridgeReady } from "@/services/api/bridge";
import { settingsApi } from "@/services/api/system.api";
import type { Theme } from "@/types/creeky";

export type { Theme };

/**
 * Key of the local cache read by the pre-render script in index.html.
 */
const CACHE_KEY = "theme";

const listeners = new Set<() => void>();

/**
 * Reads the theme already applied to the document by the pre-render script.
 *
 * @returns Theme currently set on the root element.
 */
function readAppliedTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

let currentTheme: Theme = readAppliedTheme();

/**
 * Applies a theme to the root element.
 *
 * @param theme - Theme to apply.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Stores the theme in the local cache read before the first paint.
 *
 * @param theme - Theme to cache.
 */
function cacheTheme(theme: Theme): void {
  try {
    localStorage.setItem(CACHE_KEY, theme);
  } catch {
    return;
  }
}

/**
 * Subscribes to theme changes.
 *
 * @param listener - Callback invoked after the theme changes.
 * @returns Function that removes the subscription.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Returns the active theme.
 *
 * @returns Active theme.
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Switches the theme for every subscriber and persists it in the backend.
 * The document is updated synchronously so all components agree on the
 * theme within the same frame.
 *
 * @param next - Theme to activate.
 */
export function setTheme(next: Theme): void {
  if (next === currentTheme) return;
  currentTheme = next;
  applyTheme(next);
  cacheTheme(next);
  listeners.forEach((listener) => listener());
  if (isBridgeReady()) void settingsApi.setTheme(next).catch(() => undefined);
}

/**
 * Hook for the shared light and dark theme.
 *
 * @returns The active theme with setters.
 */
export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribe, getTheme);

  const toggleTheme = useCallback(() => {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }, []);

  return { theme, setTheme, toggleTheme };
}
