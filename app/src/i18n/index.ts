import { useSyncExternalStore } from "react";
import type { Language } from "@/types/creeky";
import { es } from "@/i18n/locales/es";
import type { MessageKey } from "@/i18n/locales/es";
import { en } from "@/i18n/locales/en";

export type { MessageKey };

/**
 * Values interpolated into a message.
 */
export type MessageParams = Record<string, string | number>;

/**
 * Translation function bound to the active language.
 */
export type Translate = (key: MessageKey, params?: MessageParams) => string;

/**
 * Language used until the stored preference is known.
 */
export const DEFAULT_LANGUAGE: Language = "es";

/**
 * Message catalogs per language.
 */
const CATALOGS: Record<Language, Record<MessageKey, string>> = { es, en };

/**
 * BCP 47 locale used for date and number formatting per language.
 */
const LOCALES: Record<Language, string> = { es: "es-ES", en: "en-US" };

let currentLanguage: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

/**
 * Subscribes to language changes.
 *
 * @param listener - Callback invoked after the language changes.
 * @returns Function that removes the subscription.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Returns the active language.
 *
 * @returns Active language code.
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Returns the locale used to format dates and numbers.
 *
 * @returns BCP 47 locale of the active language.
 */
export function getLocale(): string {
  return LOCALES[currentLanguage];
}

/**
 * Switches the active language and notifies subscribers.
 *
 * @param language - Language to activate.
 */
export function applyLanguage(language: Language): void {
  if (language === currentLanguage || !(language in CATALOGS)) return;
  currentLanguage = language;
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

/**
 * Translates a message in the active language.
 *
 * @param key - Message identifier.
 * @param params - Values replacing `{name}` placeholders.
 * @returns Translated and interpolated message.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template = CATALOGS[currentLanguage][key] ?? es[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * Translates a backend error code into a user-facing message.
 *
 * @param error - Value thrown by an API call.
 * @returns Message for the error, or a generic one when the code is unknown.
 */
export function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error);
  const key = `error.${code}` as MessageKey;
  return key in es ? t(key) : t("error.unexpected");
}

/**
 * Hook exposing translation helpers that re-render on language changes.
 *
 * @returns The translate function, the active language and its locale.
 */
export function useI18n(): { t: Translate; language: Language; locale: string } {
  const language = useSyncExternalStore(subscribe, getLanguage);
  return { t, language, locale: LOCALES[language] };
}
