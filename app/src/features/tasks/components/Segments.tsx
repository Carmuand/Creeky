import { Icon } from "@/components/icons/Icon";
import { useI18n } from "@/i18n";

/**
 * Properties for the {@link Segments} component.
 */
interface SegmentsProps {
  counts: { today: number; week: number; inbox: number };
  onAdd: (preset: { list: string; due: string }) => void;
  todayISO: string;
  weekEndISO: string;
}

/**
 * Quick-capture cards for today, the week and the inbox.
 *
 * @param props - Component properties.
 * @returns The quick-capture cards.
 */
export function Segments({ counts, onAdd, todayISO, weekEndISO }: SegmentsProps) {
  const { t } = useI18n();
  return (
    <div className="mb-4 grid grid-cols-3 gap-3 max-[900px]:grid-cols-1" role="group" aria-label={t("segments.aria")}>
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--accent)" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><Icon name="calendar" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">{t("common.today")}</b><small className="text-xs text-(--muted)">{t("segments.today", { count: counts.today })}</small></div>
        <button className="shrink-0 rounded-md border border-(--accent-border) bg-(--accent-light) px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent) hover:text-white transition-colors" onClick={() => onAdd({ list: "inbox", due: todayISO })}>{t("segments.new")}</button>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--secondary)" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--secondary-light) text-(--secondary)"><Icon name="calendar" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">{t("segments.week.title")}</b><small className="text-xs text-(--muted)">{t("segments.week", { count: counts.week })}</small></div>
        <button className="shrink-0 rounded-md border border-(--secondary-border) bg-(--secondary-light) px-3 py-1.5 text-xs font-medium text-(--secondary) hover:bg-(--secondary) hover:text-white transition-colors" onClick={() => onAdd({ list: "inbox", due: weekEndISO })}>{t("segments.new")}</button>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="inbox" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">{t("segments.inbox.title")}</b><small className="text-xs text-(--muted)">{t("segments.inbox", { count: counts.inbox })}</small></div>
        <button className="shrink-0 rounded-md border border-(--border-medium) bg-(--bg-primary) px-3 py-1.5 text-xs font-medium text-(--text) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={() => onAdd({ list: "inbox", due: "" })}>{t("segments.new")}</button>
      </div>
    </div>
  );
}