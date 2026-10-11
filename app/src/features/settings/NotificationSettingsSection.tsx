import { useState } from "react";
import type { ComponentType } from "react";
import { BellRing, CalendarClock, DoorOpen, GraduationCap, ListChecks, Repeat, Timer } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { notificationsApi, unadApi } from "@/services/api";
import type { NotificationCategory } from "@/types/creeky";

/**
 * Row of the desktop notification settings.
 */
interface CategoryRow {
  /** Category the switch controls. */
  id: Exclude<NotificationCategory, "desktop">;
  /** Message key of the row title. */
  titleKey: MessageKey;
  /** Message key of the row description. */
  textKey: MessageKey;
  /** Icon shown next to the title. */
  icon: ComponentType<{ className?: string }>;
}

/**
 * Categories produced by the built-in features.
 */
const FEATURE_ROWS: CategoryRow[] = [
  { id: "tasks", titleKey: "settings.notif.tasks.title", textKey: "settings.notif.tasks.text", icon: ListChecks },
  { id: "habits", titleKey: "settings.notif.habits.title", textKey: "settings.notif.habits.text", icon: Repeat },
  { id: "pomodoro", titleKey: "settings.notif.pomodoro.title", textKey: "settings.notif.pomodoro.text", icon: Timer },
];

/**
 * Categories produced by the UNAD integration.
 */
const UNAD_ROWS: CategoryRow[] = [
  { id: "unad_changes", titleKey: "settings.notif.unadChanges.title", textKey: "settings.notif.unadChanges.text", icon: GraduationCap },
  { id: "unad_opening", titleKey: "settings.notif.unadOpening.title", textKey: "settings.notif.unadOpening.text", icon: DoorOpen },
  { id: "unad_deadline", titleKey: "settings.notif.unadDeadline.title", textKey: "settings.notif.unadDeadline.text", icon: CalendarClock },
];

/**
 * Lead times offered for the UNAD deadline reminder, in days.
 */
const DEADLINE_DAYS = [0, 1, 2, 3, 5, 7];

/**
 * Notifications section of the settings view. It switches the desktop
 * notifications of each feature and of the UNAD integration. Every
 * notification is still listed in the Notifications view; these switches
 * only decide whether Windows shows it.
 *
 * @returns The notification settings section.
 */
export function NotificationSettingsSection() {
  const { store } = useCreekyStore();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const prefs = store.notificationPrefs;
  const master = prefs.desktop;
  const unad = store.unad;

  const toggle = (category: NotificationCategory, enabled: boolean) => {
    if (busy) return;
    setBusy(true);
    notificationsApi
      .setPreference(category, enabled)
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const changeDeadline = (value: string) => {
    unadApi.updateSettings({ deadlineDays: Number(value) }).catch((error: unknown) => pushToast(errorMessage(error), "error"));
  };

  const renderRow = (row: CategoryRow, disabled: boolean) => {
    const Icon = row.icon;
    return (
      <div key={row.id} className="flex items-center gap-3 py-3">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--muted)"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <b className="block text-sm font-medium text-(--text-primary)">{t(row.titleKey)}</b>
          <span className="block text-xs text-(--muted)">{t(row.textKey)}</span>
        </div>
        <Switch checked={prefs[row.id]} onChange={(next) => toggle(row.id, next)} label={t(row.titleKey)} disabled={disabled || busy} />
      </div>
    );
  };

  return (
    <div role="tabpanel" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><BellRing className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t("settings.notif.master.title")}</h3>
            <p className="mt-0.5 text-xs text-(--muted)">{t("settings.notif.master.text")}</p>
          </div>
          <Switch checked={master} onChange={(next) => toggle("desktop", next)} label={t("settings.notif.master.title")} disabled={busy} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--accent)" />
        <h3 className="font-semibold">{t("settings.notif.features")}</h3>
        <div className="mt-1 flex flex-col divide-y divide-(--border-light)">
          {FEATURE_ROWS.map((row) => renderRow(row, !master))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--secondary)" />
        <h3 className="font-semibold">{t("settings.notif.unad")}</h3>
        {!unad.connected ? <p className="mt-1 text-xs text-(--muted)">{t("settings.notif.unad.disconnected")}</p> : null}
        <div className="mt-1 flex flex-col divide-y divide-(--border-light)">
          {UNAD_ROWS.map((row) => renderRow(row, !master || !unad.connected))}
        </div>
        {unad.account ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-(--border-light) pt-3">
            <div className="min-w-0">
              <b className="block text-sm font-medium text-(--text-primary)">{t("settings.notif.deadlineDays.title")}</b>
              <span className="block text-xs text-(--muted)">{t("settings.notif.deadlineDays.text")}</span>
            </div>
            <div className="w-44">
              <Select
                value={String(unad.account.deadlineDays)}
                onChange={changeDeadline}
                options={[...new Set([...DEADLINE_DAYS, unad.account.deadlineDays])].sort((a, b) => a - b).map((days) => ({ value: String(days), label: days === 0 ? t("settings.notif.deadlineDays.same") : t("settings.notif.deadlineDays.option", { count: days }) }))}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
