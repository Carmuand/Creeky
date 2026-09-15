/**
 * useCreekyStore — React wrapper around localStorage db (no zustand).
 * Provides reactive DB via state + save helper. Any mutation must go through setDb + db.save.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreekyDB } from "@/types/creeky";
import { db, rolloverHabits } from "@/services/storage";

export function useCreekyStore() {
  const [store, setStore] = useState<CreekyDB>(() => {
    const s = db.load();
    try { if (rolloverHabits(s)) db.save(s); } catch { /* ignore */ }
    return s;
  });

  const save = useCallback((next: CreekyDB) => {
    db.save(next);
    setStore({ ...next });
  }, []);

  const update = useCallback((mutator: (draft: CreekyDB) => void) => {
    const next = db.load();
    mutator(next);
    db.save(next);
    setStore({ ...next });
  }, []);

  const refresh = useCallback(() => {
    const s = db.load();
    try { if (rolloverHabits(s)) db.save(s); } catch { /* ignore */ }
    setStore({ ...s });
  }, []);

  // Keep tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === "creeky_db_v1") refresh(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return useMemo(() => ({ store, save, update, refresh, setStore }), [store, save, update, refresh]);
}
