/**
 * Shared range type for the profile statistic charts.
 */
export type StatRange = "all" | "week";

/**
 * Properties for the {@link StatTabs} component.
 */
export interface StatTabsProps {
  /** Currently selected range. */
  value: StatRange;
  /** Called when the user picks another range. */
  onChange: (next: StatRange) => void;
}

/**
 * Segmented range control rendered in the chart headers.
 */
export function StatTabs({ value, onChange }: StatTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-(--bg-tertiary) p-1" role="tablist" aria-label="Rango de estadísticas">
      <button
        type="button"
        role="tab"
        aria-selected={value === "all"}
        onClick={() => onChange("all")}
        className={`rounded-md px-3 py-1 text-xs transition-colors ${value === "all" ? "bg-(--bg-primary) font-semibold text-(--text) shadow-sm" : "text-(--muted) hover:text-(--text)"}`}
      >
        Todo
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "week"}
        onClick={() => onChange("week")}
        className={`rounded-md px-3 py-1 text-xs transition-colors ${value === "week" ? "bg-(--bg-primary) font-semibold text-(--text) shadow-sm" : "text-(--muted) hover:text-(--text)"}`}
      >
        Últimos 7 días
      </button>
    </div>
  );
}
