import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { CalendarDays, ClipboardList, Flame, Timer } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { addDaysISO, isoWeekKey, mondayOfWeekKey, todayISO } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Time segments available in the pulse card.
 */
type PulseSegment = "week" | "month" | "quarter";

/**
 * Static definition of a pulse segment.
 */
interface SegmentDef {
  /** Stable identifier. */
  id: PulseSegment;
  /** Message key of the tab label. */
  labelKey: MessageKey;
  /** Days covered by the segment. */
  days: number;
  /** Message key of the delta caption shown below each value. */
  versusKey: MessageKey;
  /** Message key of the footer summary. */
  footerKey: MessageKey;
}

/**
 * Segment catalog.
 */
const SEGMENTS: SegmentDef[] = [
  { id: "week", labelKey: "pulse.week", days: 7, versusKey: "pulse.week.versus", footerKey: "pulse.week.footer" },
  { id: "month", labelKey: "pulse.month", days: 30, versusKey: "pulse.month.versus", footerKey: "pulse.month.footer" },
  { id: "quarter", labelKey: "pulse.quarter", days: 90, versusKey: "pulse.quarter.versus", footerKey: "pulse.quarter.footer" },
];

/**
 * Key performance indicator shown in a mini card.
 */
interface PulseKpi {
  /** Stable identifier. */
  id: string;
  /** Mini card label. */
  label: string;
  /** Icon rendered next to the label. */
  icon: ComponentType<{ className?: string }>;
  /** Formatted total for the segment. */
  display: string;
  /** Percent change against the previous equivalent segment. */
  delta: number;
  /** Daily series rendered as a sparkline. */
  series: number[];
}

/**
 * Sparkline canvas size.
 */
const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 32;
const SPARK_PAD = 3;

/**
 * Builds a smooth SVG path with its area fill for the given values.
 *
 * @param values - Daily values to plot.
 * @returns The line path and the closed area path.
 */
function buildSparkPaths(values: number[]): { line: string; area: string } {
  const peak = Math.max(...values, 1);
  const step = values.length > 1 ? SPARK_WIDTH / (values.length - 1) : 0;
  const points = values.map((value, index) => ({
    x: index * step,
    y: SPARK_HEIGHT - SPARK_PAD - (value / peak) * (SPARK_HEIGHT - SPARK_PAD * 2),
  }));
  if (points.length === 1) {
    const single = `M 0 ${points[0]?.y ?? SPARK_HEIGHT} L ${SPARK_WIDTH} ${points[0]?.y ?? SPARK_HEIGHT}`;
    return { line: single, area: `${single} L ${SPARK_WIDTH} ${SPARK_HEIGHT} L 0 ${SPARK_HEIGHT} Z` };
  }
  let line = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] ?? { x: 0, y: 0 };
    const current = points[index] ?? { x: 0, y: 0 };
    const before = points[index - 2] ?? previous;
    const after = points[index + 1] ?? current;
    const c1x = previous.x + (current.x - before.x) / 6;
    const c1y = previous.y + (current.y - before.y) / 6;
    const c2x = current.x - (after.x - previous.x) / 6;
    const c2y = current.y - (after.y - previous.y) / 6;
    line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${current.x} ${current.y}`;
  }
  return { line, area: `${line} L ${SPARK_WIDTH} ${SPARK_HEIGHT} L 0 ${SPARK_HEIGHT} Z` };
}

/**
 * Day bounds for a segment ending today.
 */
function segmentDays(days: number): { iso: string; start: number; end: number }[] {
  const today = todayISO();
  return Array.from({ length: days }, (_, offset) => {
    const iso = addDaysISO(today, -(days - 1 - offset));
    const [y, m, d] = iso.split("-").map(Number);
    const start = new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
    return { iso, start, end: start + 864e5 };
  });
}

/**
 * Percent change of current against previous, safe for empty baselines.
 *
 * @param current - Total of the current segment.
 * @param previous - Total of the previous segment.
 * @returns The change as a percentage.
 */
function changePercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Unified workspace-pulse card replacing the first two charts.
 *
 * Shows four filterable KPIs with deltas against the previous equivalent
 * segment and daily sparklines, all computed from local data.
 */
export function PulseCard() {
  const { store } = useCreekyStore();
  const { t, language } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const [segmentId, setSegmentId] = useState<PulseSegment>("week");
  const segment = SEGMENTS.find((item) => item.id === segmentId) ?? SEGMENTS[0]!;

  const kpis = useMemo<PulseKpi[]>(() => {
    const days = segmentDays(segment.days);
    const previous = segmentDays(segment.days * 2).slice(0, segment.days);
    const indexOf = new Map(days.map((day, index) => [day.iso, index]));
    const previousIndexOf = new Map(previous.map((day, index) => [day.iso, index]));
    const empty = () => Array<number>(segment.days).fill(0);

    const created = empty();
    const createdPrevious = empty();
    for (const task of store.tasks) {
      if (task.deleted) continue;
      const at = task.createdAt || 0;
      const hit = days.findIndex((day) => at >= day.start && at < day.end);
      if (hit >= 0) created[hit] = (created[hit] ?? 0) + 1;
      const prev = previous.findIndex((day) => at >= day.start && at < day.end);
      if (prev >= 0) createdPrevious[prev] = (createdPrevious[prev] ?? 0) + 1;
    }

    const focus = empty();
    const focusPrevious = empty();
    for (const entry of store.pomoLog) {
      if (entry.mode !== "focus") continue;
      const hit = days.findIndex((day) => (entry.ts || 0) >= day.start && (entry.ts || 0) < day.end);
      if (hit >= 0) focus[hit] = (focus[hit] ?? 0) + (entry.minutes || 0);
      const prev = previous.findIndex((day) => (entry.ts || 0) >= day.start && (entry.ts || 0) < day.end);
      if (prev >= 0) focusPrevious[prev] = (focusPrevious[prev] ?? 0) + (entry.minutes || 0);
    }

    const habits = empty();
    const habitsPrevious = empty();
    for (const habit of store.habits) {
      const dates = new Set<string>();
      for (const [iso, done] of Object.entries(habit.history || {})) {
        if (done) dates.add(iso);
      }
      const monday = mondayOfWeekKey(habit.week || isoWeekKey(new Date()));
      (habit.days || []).forEach((done, offset) => {
        if (done) dates.add(addDaysISO(monday, offset));
      });
      for (const iso of dates) {
        const hit = indexOf.get(iso);
        if (hit !== undefined) habits[hit] = (habits[hit] ?? 0) + 1;
        const prev = previousIndexOf.get(iso);
        if (prev !== undefined) habitsPrevious[prev] = (habitsPrevious[prev] ?? 0) + 1;
      }
    }

    const due = empty();
    const duePrevious = empty();
    for (const task of store.tasks) {
      if (task.deleted || !task.due) continue;
      const hit = indexOf.get(task.due);
      if (hit !== undefined) due[hit] = (due[hit] ?? 0) + 1;
      const prev = previousIndexOf.get(task.due);
      if (prev !== undefined) duePrevious[prev] = (duePrevious[prev] ?? 0) + 1;
    }

    const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);
    const createdTotal = sum(created);
    const focusTotal = sum(focus);
    const habitsTotal = sum(habits);
    const dueTotal = sum(due);

    return [
      {
        id: "created",
        label: t("pulse.kpi.created"),
        icon: ClipboardList,
        display: createdTotal.toLocaleString(),
        delta: changePercent(createdTotal, sum(createdPrevious)),
        series: created,
      },
      {
        id: "focus",
        label: t("pulse.kpi.focus"),
        icon: Timer,
        display: `${focusTotal.toLocaleString()} min`,
        delta: changePercent(focusTotal, sum(focusPrevious)),
        series: focus,
      },
      {
        id: "habits",
        label: t("pulse.kpi.habits"),
        icon: Flame,
        display: habitsTotal.toLocaleString(),
        delta: changePercent(habitsTotal, sum(habitsPrevious)),
        series: habits,
      },
      {
        id: "due",
        label: t("pulse.kpi.due"),
        icon: CalendarDays,
        display: dueTotal.toLocaleString(),
        delta: changePercent(dueTotal, sum(duePrevious)),
        series: due,
      },
    ];
  }, [store, segment.days, t, language]);

  const createdTotal = kpis[0]?.display ?? "0";
  const focusTotal = kpis[1]?.display ?? "0 min";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) via-(--secondary) to-(--accent)" />
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold text-(--text-primary)">{t("pulse.title")}</h3>
          <p className="mt-0.5 text-[11px] text-(--muted)">{t("pulse.subtitle")}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-(--bg-tertiary) p-1" role="tablist" aria-label={t("pulse.aria.segment")}>
          {SEGMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={segmentId === item.id}
              onClick={() => setSegmentId(item.id)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${segmentId === item.id ? "bg-(--bg-primary) font-semibold text-(--text) shadow-sm" : "text-(--muted) hover:text-(--text)"}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-3 border-t border-(--border-light) p-3 max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">
        {kpis.map((kpi) => {
          const paths = buildSparkPaths(kpi.series);
          const Icon = kpi.icon;
          const positive = kpi.delta > 0.05;
          const negative = kpi.delta < -0.05;
          return (
            <div key={kpi.id} className="flex flex-col rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3">
              <p className="flex items-center gap-1.5 text-xs text-(--muted)">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{kpi.label}</span>
              </p>
              <p className="mt-1.5 text-xl font-bold text-(--text-primary)">{kpi.display}</p>
              <p className={cn("mt-0.5 text-[11px]", positive ? "font-medium text-(--secondary)" : negative ? "font-medium text-(--danger)" : "text-(--muted)")}>
                {`${positive ? "+" : ""}${kpi.delta.toFixed(1)}% ${t(segment.versusKey)}`}
              </p>
              <svg
                viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
                preserveAspectRatio="none"
                className="mt-2 h-8 w-full"
                role="img"
                aria-label={t("pulse.aria.perDay", { label: kpi.label })}
              >
                <defs>
                  <linearGradient id={`pulse-stroke-${kpi.id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--secondary)" />
                  </linearGradient>
                  <linearGradient id={`pulse-fill-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d={paths.area}
                  fill={`url(#pulse-fill-${kpi.id})`}
                  initial={false}
                  animate={{ d: paths.area }}
                  transition={{ duration: reduceMotion ? 0 : 0.5 }}
                />
                <motion.path
                  d={paths.line}
                  fill="none"
                  stroke={`url(#pulse-stroke-${kpi.id})`}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={false}
                  animate={{ d: paths.line }}
                  transition={{ duration: reduceMotion ? 0 : 0.5 }}
                />
              </svg>
            </div>
          );
        })}
      </div>
      <div className="border-t border-(--border-light) px-3 py-2">
        <p className="text-[11px] text-(--muted)">{t(segment.footerKey, { created: createdTotal, focus: focusTotal })}</p>
      </div>
    </div>
  );
}
