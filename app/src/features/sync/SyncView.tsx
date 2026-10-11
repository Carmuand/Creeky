import { useMemo, useRef, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { dataApi } from "@/services/api";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmailSyncSection } from "@/features/sync/EmailSyncSection";
import { APP_VERSION } from "@/types/creeky";

/**
 * Sync view with data status, JSON export and import, wipe and a raw
 * inspector. Data lives in the SQLite database managed by the backend.
 *
 * @returns The sync view.
 */
export function SyncView() {
  const { store, refresh } = useCreekyStore();
  const { t, locale } = useI18n();
  const [inspect, setInspect] = useState("tasks");
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const alive = useMemo(() => store.tasks.filter((t) => !t.deleted), [store.tasks]);
  const bytes = useMemo(() => JSON.stringify(store).length, [store]);

  const handleSyncNow = () => {
    void refresh().then(() => setSyncTime(new Date().toLocaleTimeString(locale)));
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creeky-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      pushToast(t("sync.toast.exportFailed"), "error");
      console.error(e);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data: unknown = JSON.parse(String(r.result));
        dataApi
          .importBackup(data)
          .then(() => pushToast(t("sync.toast.imported"), "success"))
          .catch((error: unknown) => pushToast(errorMessage(error), "error"));
      } catch {
        pushToast(t("error.invalid_backup"), "error");
      }
    };
    r.readAsText(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleWipe = () => {
    dataApi.wipe().then(() => pushToast(t("sync.toast.wiped"), "warning")).catch((error: unknown) => pushToast(errorMessage(error), "error"));
  };

  const preview = useMemo(() => {
    const arr = (store as unknown as Record<string, unknown>)[inspect];
    const count = Array.isArray(arr) ? t("sync.inspect.count", { count: arr.length }) : typeof arr;
    const text = JSON.stringify(arr, null, 2).slice(0, 2000);
    return { count, text };
  }, [store, inspect, t]);

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.sync")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">{t("sync.intro")} <b className="font-semibold">v{APP_VERSION}</b></p>
        <Button variant="primary" size="sm" onClick={handleSyncNow}>{t("sync.now")}</Button>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--accent)" />
        <h3 className="font-semibold text-(--accent)">{t("sync.status.title")}</h3>
        <div className="mt-3 flex flex-col divide-y divide-(--border-light) text-sm">
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("lists.title")}</span><b>{store.lists.length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.pending")}</span><b>{alive.filter((t) => !t.done).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.completed")}</span><b>{alive.filter((t) => t.done).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.trash")}</span><b>{store.tasks.filter((t) => t.deleted).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.today")}</span><b>{alive.filter((t) => !t.done && occursOn(t, todayISO())).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.notifications")}</span><b>{store.notifications.filter((n) => n.unread).length} / {store.notifications.length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">{t("sync.status.size")}</span><b>{(bytes / 1024).toFixed(1)} KB</b></div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--secondary)" />
        <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-(--secondary) shadow-[0_0_0_6px_var(--secondary-light)]" />
        <div><b className="text-sm">{t("sync.upToDate")}</b><div className="text-xs text-(--muted)">{t("sync.lastSync", { time: syncTime ?? t("sync.justNow") })}</div></div>
      </div>

      <EmailSyncSection />

      <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--accent)" />
          <h3 className="font-semibold text-(--accent)">{t("sync.export.title")}</h3><p className="mt-1 text-xs text-(--muted)">{t("sync.export.text")} <code className="rounded bg-(--bg-tertiary) px-1 py-0.5 text-xs">Creeky/backups/</code>.</p>
          <div className="mt-3"><Button variant="secondary" size="sm" onClick={handleExport}>{t("sync.export.button")}</Button></div>
        </div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-(--secondary)" />
          <h3 className="font-semibold text-(--secondary)">{t("sync.import.title")}</h3><p className="mt-1 text-xs text-(--muted)">{t("sync.import.text")} <code className="rounded bg-(--bg-tertiary) px-1 py-0.5 text-xs">creeky-backup.json</code> {t("sync.import.textAfter")}</p>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium hover:bg-(--bg-hover)"><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />{t("sync.import.button")}</label>
            <span className="text-xs text-(--muted)">{t("sync.wipe")}</span>
            <DeleteButton onConfirm={handleWipe} className="scale-[0.58] origin-left -my-2" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <h3 className="font-semibold">{t("sync.inspect.title")}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("common.viewColon")}</span>
          <div className="min-w-45"><Select value={inspect} onChange={setInspect} options={[{ value: "tasks", label: t("nav.tasks") }, { value: "lists", label: t("lists.title") }, { value: "habits", label: t("nav.habits") }, { value: "countdowns", label: t("sync.inspect.countdowns") }, { value: "pomoLog", label: t("sync.inspect.pomodoro") }, { value: "notifications", label: t("nav.notifications") }, { value: "tags", label: t("task.tags") }]} /></div>
          <span className="text-xs text-(--muted)">{preview.count}</span>
        </div>
        <pre className="mt-3 max-h-55 overflow-auto rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3 text-xs whitespace-pre-wrap wrap-break-word">{preview.text}</pre>
      </div>
    </section>
  );
}