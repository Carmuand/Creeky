import { useEffect, useState } from "react";
import { waitForBridge } from "@/services/api/bridge";

export function useBridge(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    waitForBridge()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  return { ready, error };
}
