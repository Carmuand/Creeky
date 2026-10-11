import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { useI18n, errorMessage } from "@/i18n";
import { pushToast } from "@/hooks/useToast";
import { windowApi } from "@/services/api";
import type { WindowSize } from "@/services/api/window.api";
import { Select } from "@/components/ui/Select";

/**
 * Formats a window size as shown in the selector.
 *
 * @param size - Window size.
 * @param isDefault - Whether it is the default size.
 * @returns Text such as `1440 × 844`.
 */
function sizeLabel(size: WindowSize, isDefault: boolean): string {
  return `${size.width} × ${size.height}${isDefault ? " •" : ""}`;
}

/**
 * Window size section of the settings view. It lists the sizes the
 * backend allows on the current monitor and asks the backend to apply
 * the chosen one, which resizes, centers and remembers the window.
 *
 * @returns The window size section.
 */
export function WindowSizeSection() {
  const { t } = useI18n();
  const [options, setOptions] = useState<WindowSize[]>([]);
  const [current, setCurrent] = useState<WindowSize | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    windowApi
      .getWindowSizes()
      .then((result) => {
        if (cancelled) return;
        setOptions(result.options);
        setCurrent(result.current);
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

  const handleChange = (value: string) => {
    const size = options.find((option) => `${option.width}x${option.height}` === value);
    if (!size || busy || (current && size.width === current.width && size.height === current.height)) return;
    setBusy(true);
    windowApi
      .setWindowSize(size.width, size.height)
      .then((applied) => {
        setCurrent(applied);
        pushToast(t("settings.window.toast"), "success");
      })
      .catch((error: unknown) => pushToast(errorMessage(error), "error"))
      .finally(() => setBusy(false));
  };

  const selectedValue = current ? `${current.width}x${current.height}` : "";
  const selectOptions = options.map((option, index) => ({
    value: `${option.width}x${option.height}`,
    label: index === 0 ? `${sizeLabel(option, true)} ${t("settings.window.default")}` : sizeLabel(option, false),
  }));

  return (
    <div role="tabpanel" className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
      <h3 className="font-semibold">{t("settings.window.title")}</h3>
      <p className="mt-1 text-xs text-(--muted)">
        {options.length <= 1 && loaded ? t("settings.window.single") : t("settings.window.text")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--border-light) bg-(--bg-secondary) text-(--accent)" aria-hidden>
          <Monitor className="h-5 w-5" />
        </span>
        <div className="min-w-55 flex-1">
          <Select
            value={selectedValue}
            options={selectOptions}
            onChange={handleChange}
            placeholder={loaded ? t("settings.window.placeholder") : t("common.loading")}
          />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-(--muted)">{t("settings.window.hint")}</p>
    </div>
  );
}
