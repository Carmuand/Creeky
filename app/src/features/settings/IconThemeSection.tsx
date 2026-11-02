import { Check } from "lucide-react";
import { useIconTheme } from "@/hooks/useIconTheme";
import { useTheme } from "@/hooks/useTheme";
import { pushToast } from "@/hooks/useToast";
import { useI18n } from "@/i18n";
import { ICON_THEMES, ICON_THEME_LABEL_KEYS, isIconThemeAvailable } from "@/lib/iconTheme";
import { cn } from "@/lib/utils";
import type { IconTheme } from "@/types/creeky";

/**
 * Icon style section of the settings view. The chosen style colors the
 * application icon and every icon of the sidebar.
 *
 * @returns The icon style section.
 */
export function IconThemeSection() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { iconTheme, effectiveIconTheme, setIconTheme } = useIconTheme();

  const handleSelect = (next: IconTheme) => {
    if (next === iconTheme) return;
    setIconTheme(next);
    pushToast(t("settings.icons.toast"), "success");
  };

  return (
    <div role="tabpanel" className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
      <h3 className="font-semibold">{t("settings.icons.title")}</h3>
      <p className="mt-1 text-xs text-(--muted)">{t("settings.icons.text")}</p>

      <div className="mt-4 grid grid-cols-3 gap-3 max-[760px]:grid-cols-2" role="radiogroup" aria-label={t("settings.icons.title")}>
        {ICON_THEMES.map((id) => {
          const available = isIconThemeAvailable(id, theme);
          const selected = iconTheme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!available}
              onClick={() => handleSelect(id)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors",
                selected ? "border-(--accent) bg-(--accent-light)" : "border-(--border-light) bg-(--bg-secondary) hover:border-(--accent)",
                !available && "cursor-not-allowed opacity-45 hover:border-(--border-light)",
              )}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-(--bg-tertiary)">
                <img src={`/assets/app/themes/${id}.png`} alt="" className="h-12 w-12 object-contain" draggable={false} />
              </span>
              <span className="text-xs font-medium text-(--text-primary)">{t(ICON_THEME_LABEL_KEYS[id])}</span>
              {!available ? (
                <span className="text-center text-[10px] text-(--muted)">
                  {theme === "dark" ? t("settings.icons.lightOnly") : t("settings.icons.darkOnly")}
                </span>
              ) : null}
              {selected ? <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-(--accent)" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {effectiveIconTheme !== iconTheme ? (
        <p className="mt-3 rounded-lg bg-(--bg-tertiary) px-3 py-2 text-xs text-(--muted)" role="status">
          {t("settings.icons.fallback", { theme: t(ICON_THEME_LABEL_KEYS[iconTheme]) })}
        </p>
      ) : null}
    </div>
  );
}
