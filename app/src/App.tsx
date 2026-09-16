import { useCallback, useEffect, useMemo, useState } from "react";
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
import { HelpView } from "@/features/help/HelpView";
import { ProfileView } from "@/features/profile/ProfileView";
import { useAppView } from "@/hooks/useAppView";
import { useBadges } from "@/hooks/useBadges";
import { useBridge } from "@/hooks/useBridge";
import { useCreekyEvents } from "@/hooks/useCreekyEvents";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useReminders } from "@/hooks/useReminders";
import { useToast } from "@/hooks/useToast";
import { db } from "@/services/storage";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { APP_VERSION } from "@/types/creeky";

export default function App() {
  const { ready: bridgeReady } = useBridge();
  const { store, refresh } = useCreekyStore();
  const { toasts, push, dismiss } = useToast();
  const { view, setView, TITLES } = useAppView();
  const badges = useBadges(store);

  const [collapsed, setCollapsed] = useState(false);
  const [authed, setAuthed] = useState(() => !!db.load().session);

  useCreekyEvents({ onToast: (p) => push(p.message, p.type ?? "info"), onNavigate: (v) => { if (v in TITLES) setView(v as never); } });
  useReminders({ onToast: push, onRefresh: refresh });

  const handleAuthed = useCallback(() => { refresh(); setAuthed(true); push("Sesión iniciada.", "success"); }, [push, refresh]);
  const handleLogout = useCallback(() => { const s = db.load(); s.session = null; db.save(s); refresh(); setAuthed(false); push("Sesión cerrada.", "info"); }, [push, refresh]);

  const user = useMemo(() => {
    if (!store.session) return null;
    return store.users.find((u) => u.id === store.session) || null;
  }, [store]);

  useEffect(() => {
    try {
      const alive = store.tasks.filter((t) => !t.deleted);
      console.log(`%cCreeky v${APP_VERSION}%c tareas vivas:${alive.length} (pendientes:${alive.filter((t) => !t.done).length}) • listas:${store.lists.length} • hoy:${alive.filter((t) => !t.done && occursOn(t, todayISO())).length} • notif sin leer:${store.notifications.filter((n) => n.unread).length}/${store.notifications.length}`, "font-weight:bold", "");
    } catch { /* ignore */ }
  }, [store]);

  if (!authed) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg-secondary)">
        <TitleBar bridgeReady={bridgeReady} />
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
      case "help": return <HelpView />;
      case "profile": return <ProfileView />;
      default: return <TasksView onToast={push} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg-secondary) text-(--text)">
        <TitleBar bridgeReady={bridgeReady} title="Creeky" />
        <div className="flex flex-1 min-h-0">
          <AppLayout view={view} onViewChange={setView} title={TITLES[view] ?? view} badges={badges} userInitial={(user?.name || "U")[0]?.toUpperCase()} onLogout={handleLogout} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)}>
            {renderView()}
          </AppLayout>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <span className="fixed bottom-1 right-2 text-[10px] text-(--muted) opacity-60">v{APP_VERSION}</span>
      </div>
    </TooltipProvider>
  );
}