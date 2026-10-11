import { motion, useReducedMotion } from "motion/react";
import { StatTabs } from "@/features/profile/StatTabs";
import type { StatRange } from "@/features/profile/StatTabs";
import { useI18n } from "@/i18n";

/**
 * Single goal rendered as a compact progress bar.
 */
export interface GoalBarDatum {
  /** Stable identifier. */
  id: string;
  /** Title shown above the bar. */
  label: string;
  /** Detail shown next to the percent. */
  detail: string;
  /** Completion percent, may exceed 100. */
  percent: number;
  /** Fill color of the progress bar. */
  color: string;
}

/**
 * Properties for the {@link GoalBars} component.
 */
export interface GoalBarsProps {
  /** Currently selected range. */
  range: StatRange;
  /** Called when the user picks another range. */
  onRangeChange: (next: StatRange) => void;
  /** Bars rendered top to bottom. */
  bars: GoalBarDatum[];
  /** Blended value shown in the footer. */
  footerValue: string;
  /** Card title. @default "Metas del período" */
  title?: string;
  /** Card subtitle. @default "Avance contra tu plan personal." */
  subtitle?: string;
  /** Footer label. Defaults to the translated general average label. */
  footerLabel?: string;
}

/**
 * Compact goals card with slim animated bars.
 *
 * Shares row height with its grid siblings through a full-height column layout.
 *
 * @param props - Component properties.
 * @returns The goals card.
 */
export function GoalBars({
  range,
  onRangeChange,
  bars,
  footerValue,
  title,
  subtitle,
  footerLabel,
}: GoalBarsProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) via-(--secondary) to-(--accent)" />
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold text-(--text-primary)">{title ?? t("goals.title")}</h3>
          <p className="mt-0.5 text-[11px] text-(--muted)">{subtitle ?? t("goals.subtitle")}</p>
        </div>
        <StatTabs value={range} onChange={onRangeChange} />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5 border-t border-(--border-light) p-3">
        {bars.map((bar) => (
          <div key={bar.id}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-(--text-primary)">{bar.label}</span>
              <span className="text-(--muted)">
                {bar.detail}
                <b className="ml-1.5 text-(--text-primary)">{`${Math.round(bar.percent)}%`}</b>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-(--bg-tertiary)">
              <motion.div
                className="h-full rounded-full"
                style={{ background: bar.color }}
                initial={reduceMotion ? undefined : { width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, bar.percent))}%` }}
                transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-(--border-light) px-3 py-2">
        <span className="text-[11px] text-(--muted)">{footerLabel ?? t("goals.footer")}</span>
        <b className="text-xs text-(--text-primary)">{footerValue}</b>
      </div>
    </div>
  );
}
