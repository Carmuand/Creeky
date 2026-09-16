import { useEffect, useState } from "react";
import type { CreekyView } from "@/components/layout/Sidebar";

const TITLES: Record<CreekyView, string> = {
  tasks: "Tareas",
  calendar: "Calendario",
  pomodoro: "Pomodoro",
  eisenhower: "Matriz Eisenhower",
  habits: "Hábitos",
  countdown: "Cuenta regresiva",
  search: "Búsqueda",
  sync: "Sincronización",
  notifications: "Notificaciones",
  help: "Ayuda",
  profile: "Perfil",
};

/**
 * Manages the current view and hash synchronization.
 */
export function useAppView() {
  const getInitial = (): CreekyView => {
    const hash = window.location.hash.slice(1) as CreekyView;
    if (hash && hash in TITLES) return hash;
    return "tasks";
  };

  const [view, setView] = useState<CreekyView>(getInitial);

  useEffect(() => { window.location.hash = view; }, [view]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1) as CreekyView;
      if (h && h in TITLES) setView(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { view, setView, TITLES };
}