import { motion, useReducedMotion } from "motion/react";
import { useI18n } from "@/i18n";
import { StatTabs } from "@/features/profile/StatTabs";
import type { StatRange } from "@/features/profile/StatTabs";
import { cn } from "@/lib/utils";

/**
 * Single funnel stage.
 */
export interface FunnelStage {
  /** Stable identifier. */
  id: string;
  /** Title shown above the bar. */
  label: string;
  /** Absolute task count for the stage. */
  value: number;
}

/**
 * Properties for the {@link TaskFunnel} component.
 */
export interface TaskFunnelProps {
  /** Currently selected range. */
  range: StatRange;
  /** Called when the user picks another range. */
  onRangeChange: (next: StatRange) => void;
  /** Stages rendered from widest to narrowest. */
  stages: FunnelStage[];
  /** Conversion value shown in the footer. */
  footerValue: string;
}

/**
 * Formats a percentage with one decimal place.
 *
 * @param value - Percentage value.
 * @returns Formatted percentage.
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Signup-funnel style card adapted to the Creeky task flow.
 *
 * Renders decreasing stage bars with drop annotations, steepest-fall
 * highlight, hover tooltips and a total conversion footer.
 *
 * @param props - Component properties.
 * @returns The task funnel card.
 */
export function TaskFunnel({ range, onRangeChange, stages, footerValue }: TaskFunnelProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const top = stages[0]?.value ?? 0;

  let steepestIndex = -1;
  let steepestDrop = 0;
  stages.forEach((stage, index) => {
    if (index === 0) return;
    const previous = stages[index - 1]?.value ?? 0;
    if (previous <= 0) return;
    const drop = previous - stage.value;
    if (drop > steepestDrop) {
      steepestDrop = drop;
      steepestIndex = index;
    }
  });

  return (
    <div className="flex h-full flex-col rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold text-(--text-primary)">{t("profile.funnel.title")}</h3>
          <p className="mt-0.5 text-[11px] text-(--muted)">{t("profile.funnel.subtitle")}</p>
        </div>
        <StatTabs value={range} onChange={onRangeChange} />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5 border-t border-(--border-light) p-3">
        {stages.map((stage, index) => {
          const previous = index > 0 ? (stages[index - 1]?.value ?? 0) : 0;
          const fromTop = top > 0 ? (stage.value / top) * 100 : 0;
          const fromPrevious = previous > 0 ? (stage.value / previous) * 100 : 100;
          const lost = previous - stage.value;
          const width = Math.max(0, Math.min(100, fromTop));
          const steepest = index === steepestIndex;
          return (
            <div key={stage.id} className="group relative" tabIndex={0}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-(--text-primary)">{stage.label}</span>
                <span className="text-(--text-primary)">
                  {t("profile.funnel.tasksCount", { count: stage.value.toLocaleString() })}
                  <span className="text-(--muted)">{` · ${t("profile.funnel.totalShare", { percent: formatPercent(fromTop) })}`}</span>
                </span>
              </div>
              <div className="mt-1 h-6 rounded-md bg-(--bg-tertiary)">
                <motion.div
                  className="h-full rounded-lg bg-(--text-primary)"
                  initial={reduceMotion ? undefined : { width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                />
              </div>
              {index > 0 ? (
                <p className={cn("mt-0.5 flex items-center gap-1.5 text-[11px]", steepest ? "font-medium text-(--secondary)" : "text-(--muted)")}>
                  {steepest ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--secondary)" /> : null}
                  {previous <= 0 || lost <= 0
                    ? t("profile.funnel.previousComparison", { percent: formatPercent(fromPrevious) })
                    : steepest
                      ? t("profile.funnel.tasksLostBiggest", {
                          count: lost.toLocaleString(),
                          percent: formatPercent(100 - fromPrevious),
                          drop: t("profile.funnel.biggestDrop"),
                        })
                      : t("profile.funnel.tasksLost", {
                          count: lost.toLocaleString(),
                          percent: formatPercent(100 - fromPrevious),
                        })}
                </p>
              ) : null}
              <div className="pointer-events-none absolute right-0 top-0 z-10 hidden w-56 -translate-y-full rounded-lg border border-(--border-medium) bg-(--bg-primary) p-3 shadow-xl group-hover:block group-focus-within:block">
                <p className="text-xs text-(--muted)">{stage.label}</p>
                <p className="mt-0.5 text-sm font-bold text-(--text-primary)">{t("profile.funnel.tasksCount", { count: stage.value.toLocaleString() })}</p>
                <p className="mt-0.5 text-xs text-(--muted)">
                  {index === 0
                    ? t("profile.funnel.totalShare", { percent: formatPercent(fromTop) })
                    : t("profile.funnel.previousAndTotal", {
                        previous: formatPercent(fromPrevious),
                        total: formatPercent(fromTop),
                      })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-(--border-light) px-3 py-2">
        <span className="text-[11px] text-(--muted)">{t("profile.funnel.conversion")}</span>
        <b className="text-xs text-(--text-primary)">{footerValue}</b>
      </div>
    </div>
  );
}
