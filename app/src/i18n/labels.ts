import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS } from "@/types/creeky";
import type { Priority } from "@/types/creeky";

/**
 * Priority metadata with its label translated.
 */
export type LocalizedPrioMeta = Record<Priority, { mark: string; label: string; color: string }>;

/**
 * Returns the priority metadata with labels in the active language.
 *
 * @returns Mark, label and color per priority.
 */
export function usePrioMeta(): LocalizedPrioMeta {
  const { t, language } = useI18n();
  return useMemo(() => {
    const entries = Object.entries(PRIO_META).map(([priority, meta]) => [priority, { mark: meta.mark, label: t(meta.labelKey), color: meta.color }]);
    return Object.fromEntries(entries) as LocalizedPrioMeta;
  }, [t, language]);
}

/**
 * Returns the reminder lead times with labels in the active language.
 *
 * @returns Options with their minutes and label.
 */
export function useRemindOptions(): { v: number; label: string }[] {
  const { t, language } = useI18n();
  return useMemo(() => REMIND_OPTIONS.map((option) => ({ v: option.v, label: t(option.labelKey) })), [t, language]);
}

/**
 * Returns the weekdays with single-letter labels in the active language.
 *
 * @returns Weekdays in display order with their label.
 */
export function useWeekdays(): { v: number; label: string }[] {
  const { t, language } = useI18n();
  return useMemo(() => WEEKDAYS.map((weekday) => ({ v: weekday.v, label: t(weekday.labelKey) })), [t, language]);
}
