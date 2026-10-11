import { motion, useReducedMotion } from "motion/react";
import { StatTabs } from "@/features/profile/StatTabs";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n";
import type { StatRange } from "@/features/profile/StatTabs";

/**
 * Single donut segment.
 */
export interface DonutSegment {
  /** Stable identifier. */
  id: string;
  /** Legend label. */
  label: string;
  /** Absolute task count. */
  value: number;
  /** Segment color. */
  color: string;
}

/**
 * Properties for the {@link ListDonut} component.
 */
export interface ListDonutProps {
  /** Currently selected range. */
  range: StatRange;
  /** Called when the user picks another range. */
  onRangeChange: (next: StatRange) => void;
  /** Segments rendered around the donut. */
  segments: DonutSegment[];
}

/**
 * Donut geometry shared by every segment.
 */
const DONUT_SIZE = 150;
const DONUT_STROKE = 30;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
/**
 * Gap between segments as a fraction of the whole ring.
 */
const SEGMENT_GAP = 0.008;

/**
 * Donut chart adapted to the Creeky lists.
 *
 * Shows the task distribution per list with a total in the center
 * and a legend with counts and percents.
 *
 * @param props - Component properties.
 * @returns The donut chart card.
 */
export function ListDonut({ range, onRangeChange, segments }: ListDonutProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { t } = useI18n();
  const total = segments.reduce((acc, segment) => acc + segment.value, 0);

  let cursor = 0;
  const arcs = segments.map((segment) => {
    const fraction = total > 0 ? segment.value / total : 0;
    const start = cursor;
    cursor += fraction;
    const visible = Math.max(0, fraction - (fraction > 0 ? SEGMENT_GAP : 0));
    return { segment, length: visible * DONUT_CIRCUMFERENCE, offset: -start * DONUT_CIRCUMFERENCE, percent: fraction * 100 };
  });

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) via-(--secondary) to-(--accent)" />
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold text-(--text-primary)">{t("donut.title")}</h3>
          <p className="mt-0.5 text-[11px] text-(--muted)">{t("donut.subtitle")}</p>
        </div>
        <StatTabs value={range} onChange={onRangeChange} />
      </div>
      <div className="flex flex-1 items-center gap-4 border-t border-(--border-light) p-3 max-[600px]:flex-col">
        <div className="relative shrink-0" role="img" aria-label={t("donut.aria", { total })}>
          <motion.svg
            width={DONUT_SIZE}
            height={DONUT_SIZE}
            viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={DONUT_STROKE}
            />
            <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
              {arcs.map(({ segment, length, offset }) =>
                segment.value > 0 ? (
                  <motion.circle
                    key={segment.id}
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={DONUT_STROKE}
                    strokeDasharray={`${length} ${DONUT_CIRCUMFERENCE - length}`}
                    animate={{ strokeDasharray: `${length} ${DONUT_CIRCUMFERENCE - length}`, strokeDashoffset: offset }}
                    transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.32, 0.72, 0, 1] }}
                  />
                ) : null,
              )}
            </g>
          </motion.svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-(--text-primary)">{total.toLocaleString()}</span>
            <span className="text-[11px] text-(--muted)">{t("nav.tasks")}</span>
          </div>
        </div>
        <ul className="flex max-h-48 w-full min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-y-auto">
          {segments.map((segment, index) => (
            <TooltipSimple key={segment.id} content={t("donut.segment", { label: segment.label, count: segment.value })} side="top">
            <li className="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-(--bg-hover)">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
              <span className="min-w-0 flex-1 truncate text-(--text-primary)">{segment.label}</span>
              <b className="text-(--text-primary)">{segment.value.toLocaleString()}</b>
              <span className="w-11 shrink-0 text-right text-[11px] text-(--muted)">{`${arcs[index]?.percent.toFixed(1) ?? "0.0"}%`}</span>
            </li>
            </TooltipSimple>
          ))}
        </ul>
      </div>
    </div>
  );
}
