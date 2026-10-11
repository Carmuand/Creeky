import { useEffect, useState } from "react";
import { waitForBridge } from "@/services/api/bridge";
import { setTheme } from "@/hooks/useTheme";
import { getStore, refreshStore } from "@/services/store";

/**
 * Waits for the pywebview bridge, loads the first snapshot and aligns the
 * theme with the stored preference.
 *
 * @returns Whether the bridge and the store are ready, and the failure message when they are not.
 */
export function useBridge(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    waitForBridge()
      .then(() => refreshStore())
      .then(() => {
        setTheme(getStore().settings.theme);
        if (!cancelled) setReady(true);
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  return { ready, error };
}
