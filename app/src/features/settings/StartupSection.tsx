import { useEffect, useState } from "react";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { authApi, settingsApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Startup section of the settings view. It toggles whether Creeky starts
 * with Windows, which the backend records in the user's Run registry key,
 * and lets the user replay the guided tour.
 *
 * @returns The startup section.
 */
export function StartupSection() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getAutostart()
      .then((result) => {
        if (cancelled) return;
        setEnabled(result.enabled);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoaded(true);
        pushToast(errorMessage(error), "error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = () => {
    if (busy || !loaded) return;
    setBusy(true);
    settingsApi
      .setAutostart(!enabled)
      .then((result) => {
        setEnabled(result.enabled);
        pushToast(result.enabled ? t("settings.startup.toast.on") : t("settings.startup.toast.off"), "success");
      })
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const handleReplay = () => {
    authApi.setOnboarded(false).catch((error: unknown) => pushToast(errorMessage(error), "error"));
  };

  return (
    <div role="tabpanel" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold">{t("settings.startup.title")}</h3>
            <p className="mt-1 text-xs text-(--muted)">{t("settings.startup.text")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t("settings.startup.title")}
            disabled={busy || !loaded}
            onClick={handleToggle}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              enabled ? "border-(--accent) bg-(--accent)" : "border-(--border-medium) bg-(--bg-tertiary)",
            )}
          >
            <span aria-hidden className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-[left]", enabled ? "left-5.5" : "left-0.5")} />
          </button>
        </div>
        <p className="mt-3 text-[11px] text-(--muted)">{enabled ? t("settings.startup.on") : t("settings.startup.off")}</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--secondary) to-(--accent)" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold">{t("settings.tour.title")}</h3>
            <p className="mt-1 text-xs text-(--muted)">{t("settings.tour.text")}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReplay}>{t("settings.tour.replay")}</Button>
        </div>
      </div>
    </div>
  );
}
