import { useEffect, useState } from "react";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { authApi, settingsApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

/**
 * Startup section of the settings view. It toggles whether Creeky starts
 * with Windows, whether it starts minimized, and whether closing the
 * window keeps it running in the tray. It also lets the user replay the
 * guided tour.
 *
 * @returns The startup section.
 */
export function StartupSection() {
  const { t } = useI18n();
  const [autostart, setAutostart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [minimizeOnClose, setMinimizeOnClose] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      settingsApi.getAutostart(),
      settingsApi.getStartupOptions(),
    ])
      .then(([autostartResult, options]) => {
        if (cancelled) return;
        setAutostart(autostartResult.enabled);
        setStartMinimized(options.startMinimized);
        setMinimizeOnClose(options.minimizeOnClose);
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

  const handleToggleAutostart = () => {
    if (busy || !loaded) return;
    setBusy(true);
    settingsApi
      .setAutostart(!autostart)
      .then((result) => {
        setAutostart(result.enabled);
        pushToast(result.enabled ? t("settings.startup.toast.on") : t("settings.startup.toast.off"), "success");
      })
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const handleToggleStartMinimized = () => {
    if (busy || !loaded || !autostart) return;
    setBusy(true);
    settingsApi
      .setStartMinimized(!startMinimized)
      .then((result) => {
        setStartMinimized(result.startMinimized);
        pushToast(
          result.startMinimized ? t("settings.startup.minimized.toast.on") : t("settings.startup.minimized.toast.off"),
          "success",
        );
      })
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const handleToggleMinimizeOnClose = () => {
    if (busy || !loaded) return;
    setBusy(true);
    settingsApi
      .setMinimizeOnClose(!minimizeOnClose)
      .then((result) => {
        setMinimizeOnClose(result.minimizeOnClose);
        pushToast(
          result.minimizeOnClose ? t("settings.startup.close.toast.on") : t("settings.startup.close.toast.off"),
          "success",
        );
      })
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const handleReplay = () => {
    window.location.hash = "tasks";
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
          <Switch
            checked={autostart}
            onChange={handleToggleAutostart}
            label={t("settings.startup.title")}
            disabled={busy || !loaded}
          />
        </div>
        <p className="mt-3 text-[11px] text-(--muted)">{autostart ? t("settings.startup.on") : t("settings.startup.off")}</p>

        <div className="mt-4 border-t border-(--border-light) pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">{t("settings.startup.minimized.title")}</h4>
              <p className="mt-1 text-xs text-(--muted)">{t("settings.startup.minimized.text")}</p>
            </div>
            <Switch
              checked={startMinimized}
              onChange={handleToggleStartMinimized}
              label={t("settings.startup.minimized.title")}
              disabled={busy || !loaded || !autostart}
            />
          </div>
          {!autostart ? (
            <p className="mt-2 text-[11px] text-(--muted)">{t("settings.startup.minimized.requires")}</p>
          ) : null}
        </div>

        <div className="mt-4 border-t border-(--border-light) pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">{t("settings.startup.close.title")}</h4>
              <p className="mt-1 text-xs text-(--muted)">{t("settings.startup.close.text")}</p>
            </div>
            <Switch
              checked={minimizeOnClose}
              onChange={handleToggleMinimizeOnClose}
              label={t("settings.startup.close.title")}
              disabled={busy || !loaded}
            />
          </div>
        </div>
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
