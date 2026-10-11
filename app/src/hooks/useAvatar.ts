import { useEffect, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { authApi } from "@/services/api";

/**
 * Photo already loaded from the backend, keyed by user and file version
 * so the image is requested only when it changes.
 */
let cached: { key: string; url: string | null } | null = null;

/**
 * Loads the profile photo of the signed-in user. The backend stores the
 * photo as a file per user and serves it as a data URL; the snapshot only
 * carries a version number that changes with the file.
 *
 * @returns The photo as a data URL, or undefined when the user has none.
 */
export function useAvatar(): string | undefined {
  const { store } = useCreekyStore();
  const user = store.user;
  const key = user && user.avatarVersion !== null ? `${user.id}:${user.avatarVersion}` : null;
  const [url, setUrl] = useState<string | null>(() => (key && cached?.key === key ? cached.url : null));

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }
    if (cached?.key === key) {
      setUrl(cached.url);
      return;
    }
    let cancelled = false;
    authApi
      .getAvatar()
      .then((dataUrl) => {
        cached = { key, url: dataUrl };
        if (!cancelled) setUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return url ?? undefined;
}
