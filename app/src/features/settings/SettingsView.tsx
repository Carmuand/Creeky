import { useState } from "react";
import type { ComponentType } from "react";
import { ES, US } from "country-flag-icons/react/3x2";
import { BellRing, Check, GraduationCap, Languages, Monitor, Power } from "lucide-react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { applyLanguage, errorMessage, t as translate, useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { settingsApi } from "@/services/api";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/creeky";
import { WindowSizeSection } from "@/features/settings/WindowSizeSection";
import { StartupSection } from "@/features/settings/StartupSection";
import { NotificationSettingsSection } from "@/features/settings/NotificationSettingsSection";
import { UnadSection } from "@/features/settings/UnadSection";

/**
 * Tabs available in the settings view.
 */
type SettingsTab = "language" | "window" | "startup" | "notifications" | "unad";

/**
 * Language option shown in the language tab.
 */
interface LanguageOption {
  /** Language code. */
  id: Language;
  /** Name of the language written in that language. */
  nativeName: string;
  /** Message key of the language name in the active language. */
  nameKey: MessageKey;
  /** Flag icon. */
  Flag: typeof ES;
}

/**
 * Supported interface languages.
 */
const LANGUAGES: LanguageOption[] = [
  { id: "es", nativeName: "Español", nameKey: "settings.language.es", Flag: ES },
  { id: "en", nativeName: "English", nameKey: "settings.language.en", Flag: US },
];

/**
 * Settings view. Its language tab switches the interface language and
 * persists the choice in the backend.
 *
 * @returns The settings view.
 */
export function SettingsView() {
  const { store } = useCreekyStore();
  const { t, language } = useI18n();
  const [tab, setTab] = useState<SettingsTab>("language");
  const [saving, setSaving] = useState(false);

  const handleLanguage = async (next: Language) => {
    if (next === language || saving) return;
    const previous = store.settings.language;
    setSaving(true);
    applyLanguage(next);
    try {
      await settingsApi.setLanguage(next);
      pushToast(translate("settings.language.toast"), "success");
    } catch (error) {
      applyLanguage(previous);
      pushToast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "language", label: t("settings.tab.language"), icon: Languages },
    { id: "window", label: t("settings.tab.window"), icon: Monitor },
    { id: "startup", label: t("settings.tab.startup"), icon: Power },
    { id: "notifications", label: t("nav.notifications"), icon: BellRing },
    { id: "unad", label: t("settings.tab.unad"), icon: GraduationCap },
  ];

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.settings")}>
      <p className="text-sm text-(--muted)">{t("settings.intro")}</p>

      <div className="flex flex-wrap gap-1 rounded-lg bg-(--bg-tertiary) p-1 w-fit" role="tablist" aria-label={t("nav.settings")} data-tour="settings-tabs">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors", tab === item.id ? "bg-(--bg-primary) font-semibold text-(--text) shadow-sm" : "text-(--muted) hover:text-(--text)")}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "language" ? (
        <div role="tabpanel" className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
          <h3 className="font-semibold">{t("settings.language.title")}</h3>
          <p className="mt-1 text-xs text-(--muted)">{t("settings.language.text")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 max-[600px]:grid-cols-1" role="radiogroup" aria-label={t("settings.language.title")}>
            {LANGUAGES.map(({ id, nativeName, nameKey, Flag }) => {
              const selected = language === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={saving}
                  onClick={() => { void handleLanguage(id); }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed",
                    selected ? "border-(--accent) bg-(--accent-light)" : "border-(--border-light) bg-(--bg-secondary) hover:border-(--accent)",
                  )}
                >
                  <Flag aria-hidden className="h-7 w-10.5 shrink-0 overflow-hidden rounded-sm border border-(--border-light)" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-(--text-primary)">{nativeName}</b>
                    <span className="block truncate text-xs text-(--muted)">{t(nameKey)}</span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-(--accent)" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : tab === "window" ? (
        <WindowSizeSection />
      ) : tab === "startup" ? (
        <StartupSection />
      ) : tab === "notifications" ? (
        <NotificationSettingsSection />
      ) : (
        <UnadSection />
      )}
    </section>
  );
}
