import { useCallback, useEffect, useState } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastContainer } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { AuthView } from "@/features/auth/AuthView";
import { TasksView } from "@/features/tasks/TasksView";
import { CalendarView } from "@/features/calendar/CalendarView";
import { PomodoroView } from "@/features/pomodoro/PomodoroView";
import { EisenhowerView } from "@/features/eisenhower/EisenhowerView";
import { HabitsView } from "@/features/habits/HabitsView";
import { CountdownView } from "@/features/countdown/CountdownView";
import { SearchView } from "@/features/search/SearchView";
import { SyncView } from "@/features/sync/SyncView";
import { NotificationsView } from "@/features/notifications/NotificationsView";
import { SettingsView } from "@/features/settings/SettingsView";
import { HelpView } from "@/features/help/HelpView";
import { ProfileView } from "@/features/profile/ProfileView";
import { VIEW_TITLE_KEYS, isCreekyView, useAppView } from "@/hooks/useAppView";
import { useBadges } from "@/hooks/useBadges";
import { useBridge } from "@/hooks/useBridge";
import { useCreekyEvents } from "@/hooks/useCreekyEvents";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { authApi, settingsApi } from "@/services/api";
import { OnboardingTour } from "@/features/onboarding/OnboardingTour";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { APP_VERSION } from "@/types/creeky";

/**
 * Application root: waits for the backend, gates on the session and
 * renders the active view.
 *
 * @returns The application shell.
 */
export default function App() {
  const { ready, error: bridgeError } = useBridge();
  const { store } = useCreekyStore();
  const { toasts, push, dismiss } = useToast();
  const { view, setView } = useAppView();
  const { t } = useI18n();
  const badges = useBadges(store);

  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? store.settings.sidebarCollapsed;
  const user = store.user;

  useCreekyEvents(ready, {
    onReminder: ({ habits }) => {
      const hash = window.location.hash || "";
      if (hash === "#notifications" || hash === "#habits") return;
      push(habits > 0 ? t("reminder.toast.habits") : t("reminder.toast.task"), "warning");
    },
    onNavigate: (target) => { if (isCreekyView(target)) setView(target); },
  });

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsedOverride(next);
    void settingsApi.setSidebarCollapsed(next).catch(() => undefined);
  }, [collapsed]);

  const handleAuthed = useCallback(() => { push(t("auth.toast.signedIn"), "success"); }, [push, t]);
  const handleLogout = useCallback(() => {
    authApi.signOut().then(() => push(t("auth.toast.signedOut"), "info")).catch((error: unknown) => push(errorMessage(error), "error"));
  }, [push, t]);

  useEffect(() => {
    if (!ready) return;
    const alive = store.tasks.filter((task) => !task.deleted);
    console.log(`%cCreeky v${APP_VERSION}%c tasks:${alive.length} (pending:${alive.filter((task) => !task.done).length}) lists:${store.lists.length} today:${alive.filter((task) => !task.done && occursOn(task, todayISO())).length} unread:${store.notifications.filter((n) => n.unread).length}/${store.notifications.length}`, "font-weight:bold", "");
  }, [ready, store]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg-secondary)">
        <TitleBar bridgeReady={false} />
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
          {bridgeError ? (
            <>
              <p className="text-lg font-semibold text-(--text)">{t("boot.error.title")}</p>
              <p className="max-w-110 text-sm text-(--muted)">{t("boot.error.text")}</p>
            </>
          ) : (
            <>
              <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-(--border-medium) border-t-(--accent)" />
              <p className="text-sm text-(--muted)">{t("boot.loading")}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg-secondary)">
        <TitleBar bridgeReady={ready} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AuthView onAuthed={handleAuthed} onToast={push} />
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "tasks": return <TasksView onToast={push} />;
      case "calendar": return <CalendarView />;
      case "pomodoro": return <PomodoroView />;
      case "eisenhower": return <EisenhowerView />;
      case "habits": return <HabitsView />;
      case "countdown": return <CountdownView />;
      case "search": return <SearchView />;
      case "sync": return <SyncView />;
      case "notifications": return <NotificationsView />;
      case "settings": return <SettingsView />;
      case "help": return <HelpView />;
      case "profile": return <ProfileView />;
      default: return <TasksView onToast={push} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg-secondary) text-(--text)">
        <TitleBar bridgeReady={ready} title="Creeky" />
        <div className="flex flex-1 min-h-0">
          <AppLayout view={view} onViewChange={setView} title={t(VIEW_TITLE_KEYS[view])} badges={badges} userInitial={(user.name || "U")[0]?.toUpperCase()} onLogout={handleLogout} collapsed={collapsed} onToggleCollapse={handleToggleCollapse}>
            {renderView()}
          </AppLayout>
        </div>
        <OnboardingTour active={!user.onboarded} onNavigate={setView} />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <span className="fixed bottom-1 right-2 text-[10px] text-(--muted) opacity-60">v{APP_VERSION}</span>
      </div>
    </TooltipProvider>
  );
}
