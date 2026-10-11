import { useEffect, useState } from "react";
import type { CreekyView } from "@/components/layout/Sidebar";
import type { MessageKey } from "@/i18n";

/**
 * Message key of the page title for each view.
 */
export const VIEW_TITLE_KEYS: Record<CreekyView, MessageKey> = {
  tasks: "nav.tasks",
  calendar: "nav.calendar",
  pomodoro: "nav.pomodoro",
  eisenhower: "nav.eisenhower",
  habits: "nav.habits",
  countdown: "nav.countdown",
  search: "nav.search",
  sync: "nav.sync",
  notifications: "nav.notifications",
  settings: "nav.settings",
  help: "nav.help",
  profile: "nav.profile",
};

/**
 * Tells whether a string names an existing view.
 *
 * @param value - Candidate view name.
 * @returns True when the value is a known view.
 */
export function isCreekyView(value: string): value is CreekyView {
  return value in VIEW_TITLE_KEYS;
}

/**
 * Manages the current view and keeps it in sync with the URL hash.
 *
 * @returns The active view and its setter.
 */
export function useAppView(): { view: CreekyView; setView: (view: CreekyView) => void } {
  const getInitial = (): CreekyView => {
    const hash = window.location.hash.slice(1);
    return isCreekyView(hash) ? hash : "tasks";
  };

  const [view, setView] = useState<CreekyView>(getInitial);

  useEffect(() => { window.location.hash = view; }, [view]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (isCreekyView(hash)) setView(hash);
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

  return { view, setView };
}
