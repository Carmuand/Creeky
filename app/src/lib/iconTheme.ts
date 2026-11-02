import type { MessageKey } from "@/i18n/locales/es";
import type { IconTheme, Theme } from "@/types/creeky";

/**
 * Icon themes offered to the user, in display order.
 */
export const ICON_THEMES: IconTheme[] = ["purple", "green", "gray", "black", "purple-green", "green-purple"];

/**
 * Icon theme used when the user has not chosen one.
 */
export const DEFAULT_ICON_THEME: IconTheme = "purple-green";

/**
 * Color mode in which an icon theme cannot be shown.
 */
const UNAVAILABLE_IN: Partial<Record<IconTheme, Theme>> = { black: "dark", gray: "light" };

/**
 * Message key of the name of each icon theme.
 */
export const ICON_THEME_LABEL_KEYS: Record<IconTheme, MessageKey> = {
  purple: "settings.icons.purple",
  green: "settings.icons.green",
  gray: "settings.icons.gray",
  black: "settings.icons.black",
  "purple-green": "settings.icons.purpleGreen",
  "green-purple": "settings.icons.greenPurple",
};

/**
 * Local cache read before the first snapshot arrives.
 */
const CACHE_KEY = "iconTheme";

const listeners = new Set<() => void>();

/**
 * Tells whether a value is a known icon theme.
 *
 * @param value - Value read from storage or the backend.
 * @returns True when the value identifies an icon theme.
 */
function isIconTheme(value: string | null): value is IconTheme {
  return value !== null && ICON_THEMES.includes(value as IconTheme);
}

/**
 * Reads the icon theme cached in the browser.
 *
 * @returns The cached icon theme, or the default one.
 */
function readCachedIconTheme(): IconTheme {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return isIconTheme(saved) ? saved : DEFAULT_ICON_THEME;
  } catch {
    return DEFAULT_ICON_THEME;
  }
}

/**
 * Reads the color theme currently applied to the document.
 *
 * @returns The active color theme.
 */
function readColorTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

let currentIconTheme: IconTheme = readCachedIconTheme();

/**
 * Returns the icon theme chosen by the user.
 *
 * @returns The preferred icon theme.
 */
export function getIconTheme(): IconTheme {
  return currentIconTheme;
}

/**
 * Tells whether an icon theme can be used with a color theme.
 *
 * @param iconTheme - Icon theme to check.
 * @param colorTheme - Active color theme.
 * @returns True when the combination keeps the icons legible.
 */
export function isIconThemeAvailable(iconTheme: IconTheme, colorTheme: Theme): boolean {
  return UNAVAILABLE_IN[iconTheme] !== colorTheme;
}

/**
 * Returns the icon theme that must be rendered for a color theme.
 *
 * @param iconTheme - Icon theme chosen by the user.
 * @param colorTheme - Active color theme.
 * @returns The requested theme, or the default one when it cannot be shown.
 */
export function resolveIconTheme(iconTheme: IconTheme, colorTheme: Theme): IconTheme {
  return isIconThemeAvailable(iconTheme, colorTheme) ? iconTheme : DEFAULT_ICON_THEME;
}

/**
 * Stores the icon theme in the local cache read before the first snapshot.
 *
 * @param iconTheme - Icon theme to cache.
 */
function cacheIconTheme(iconTheme: IconTheme): void {
  try {
    localStorage.setItem(CACHE_KEY, iconTheme);
  } catch {
    return;
  }
}

/**
 * Applies the resolved icon theme to the document element.
 */
export function applyIconThemeDom(): void {
  document.documentElement.dataset.iconTheme = resolveIconTheme(currentIconTheme, readColorTheme());
}

/**
 * Stores an icon theme, applies it and notifies the subscribers.
 *
 * @param iconTheme - Icon theme to activate.
 */
export function applyIconThemeState(iconTheme: IconTheme): void {
  currentIconTheme = isIconTheme(iconTheme) ? iconTheme : DEFAULT_ICON_THEME;
  cacheIconTheme(currentIconTheme);
  applyIconThemeDom();
  listeners.forEach((listener) => listener());
}

/**
 * Subscribes to icon theme changes.
 *
 * @param listener - Callback invoked after the icon theme changes.
 * @returns Function that removes the subscription.
 */
export function subscribeIconTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

applyIconThemeDom();
