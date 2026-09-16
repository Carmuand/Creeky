import { useEffect, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db } from "@/services/storage";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { Pagination } from "@/components/ui/Pagination";

type NotifView = "all" | "unread" | "reminder" | "calendar" | "system";

export function NotificationsView() {
  const { store, refresh } = useCreekyStore();
  const [view, setView] = useState<NotifView>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const unread = store.notifications.filter((n) => n.unread).length;
  const list = store.notifications.filter((n) => {
    if (view === "unread") return n.unread;
    if (view === "reminder" || view === "calendar" || view === "system") return n.kind === view;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const paginated = list.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [view, store.notifications.length]);

  const markAll = () => {
    const s = db.load();
    s.notifications.forEach((n) => (n.unread = false));
    db.save(s);
    refresh();
  };

  const markOne = (id: string) => {
    const s = db.load();
    const n = s.notifications.find((x) => x.id === id);
    if (!n) return;
    n.unread = false;
    db.save(s);
    refresh();
  };

  const iconFor = (kind: string) => (kind === "reminder" ? "bell" : kind === "calendar" ? "calendar" : "info");

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Notificaciones">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-(--muted)">{unread} sin leer</p>
        <Button variant="secondary" size="sm" onClick={markAll}>Marcar leídas</Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "unread", "reminder", "calendar", "system"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full border px-3 py-1 text-xs ${view === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>
            {v === "all" ? "Todas" : v === "unread" ? `Sin leer (${unread})` : v === "reminder" ? "Alarmas" : v === "calendar" ? "Calendario" : "Sistema"}
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
              <div className="mt-1 text-xs text-(--muted)">{n.time}</div>
            </div>
            {n.unread ? <TooltipSimple content="Marcar leída" side="left"><button onClick={() => markOne(n.id)} className="shrink-0 self-start rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2.5 py-1 text-xs hover:border-(--accent) hover:text-(--accent)">Marcar leída</button></TooltipSimple> : null}
          </div>
        )) : <p className="p-4 text-sm text-(--muted)">Nada en esta vista.</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={list.length} pageSize={pageSize} className="pt-2" />
    </section>
  );
}
