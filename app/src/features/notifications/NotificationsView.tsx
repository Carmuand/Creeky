import { useEffect, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { notificationsApi } from "@/services/api";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { Pagination } from "@/components/ui/Pagination";

/**
 * Filters available in the notifications view.
 */
type NotifView = "all" | "unread" | "reminder" | "calendar" | "unad" | "system";

/**
 * Message key of the label for each filter.
 */
const FILTER_KEYS: Record<NotifView, MessageKey> = {
  all: "common.allFeminine",
  unread: "notifications.filter.unread",
  reminder: "notifications.filter.reminder",
  calendar: "nav.calendar",
  unad: "notifications.filter.unad",
  system: "notifications.filter.system",
};

const PAGE_SIZE = 10;

/**
 * Notifications view with filters, pagination and read marking. Reminders
 * are produced by the backend scheduler, which also shows them natively.
 *
 * @returns The notifications view.
 */
export function NotificationsView() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const [view, setView] = useState<NotifView>("all");
  const [page, setPage] = useState(1);

  const unread = store.notifications.filter((n) => n.unread).length;
  const list = store.notifications.filter((n) => {
    if (view === "unread") return n.unread;
    if (view === "reminder" || view === "calendar" || view === "unad" || view === "system") return n.kind === view;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paginated = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [view, store.notifications.length]);

  const report = (error: unknown) => pushToast(errorMessage(error), "error");
  const markAll = () => { notificationsApi.markAllRead().catch(report); };
  const markOne = (id: string) => { notificationsApi.markRead(id).catch(report); };

  const iconFor = (kind: string) => (kind === "reminder" ? "bell" : kind === "calendar" || kind === "unad" ? "calendar" : "info");

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.notifications")}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-(--muted)">{t("notifications.unread", { count: unread })}</p>
        <Button variant="secondary" size="sm" onClick={markAll}>{t("notifications.markAll")}</Button>
      </div>

      <div className="flex flex-wrap gap-1.5" data-tour="notif-filters">
        {(["all", "unread", "reminder", "calendar", "unad", "system"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full border px-3 py-1 text-xs ${view === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>
            {v === "unread" ? t(FILTER_KEYS[v], { count: unread }) : t(FILTER_KEYS[v])}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm">
        {paginated.length ? paginated.map((n) => (
          <div key={n.id} className={`flex gap-3 p-4 ${n.unread ? "bg-(--accent-light)" : ""} border-b border-(--border-light) last:border-0`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--muted)"><Icon name={iconFor(n.kind)} size={18} /></span>
            <div className="flex-1 min-w-0">
              <b className="block text-sm font-semibold">{n.title}</b>
              <div className="text-sm text-(--muted)">{n.text}</div>
              <div className="mt-1 text-xs text-(--muted)">{new Date(n.createdAt).toLocaleString(locale)}</div>
            </div>
            {n.unread ? <TooltipSimple content={t("notifications.markOne")} side="left"><button onClick={() => markOne(n.id)} className="shrink-0 self-start rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2.5 py-1 text-xs hover:border-(--accent) hover:text-(--accent)">{t("notifications.markOne")}</button></TooltipSimple> : null}
          </div>
        )) : <p className="p-4 text-sm text-(--muted)">{t("common.emptyView")}</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={list.length} pageSize={PAGE_SIZE} className="pt-2" />
    </section>
  );
}
