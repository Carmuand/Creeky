import { useCallback, useSyncExternalStore } from "react";
import { applyIconThemeState, getIconTheme, resolveIconTheme, subscribeIconTheme } from "@/lib/iconTheme";
import { useTheme } from "@/hooks/useTheme";
import { isBridgeReady } from "@/services/api/bridge";
import { settingsApi } from "@/services/api/system.api";
import type { IconTheme } from "@/types/creeky";

/**
 * Hook for the shared icon theme. It exposes the preferred theme, the theme
 * actually rendered for the active color mode and a setter that persists it.
 *
 * @returns The preferred icon theme, the effective one and the setter.
 */
export function useIconTheme(): {
  iconTheme: IconTheme;
  effectiveIconTheme: IconTheme;
  setIconTheme: (next: IconTheme) => void;
} {
  const iconTheme = useSyncExternalStore(subscribeIconTheme, getIconTheme);
  const { theme } = useTheme();
  const effectiveIconTheme = resolveIconTheme(iconTheme, theme);

  const setIconTheme = useCallback((next: IconTheme) => {
    if (next === getIconTheme()) return;
    applyIconThemeState(next);
    if (isBridgeReady()) void settingsApi.setIconTheme(next).catch(() => undefined);
  }, []);

  return { iconTheme, effectiveIconTheme, setIconTheme };
}
