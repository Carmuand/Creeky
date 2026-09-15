import { useCallback, useEffect, useMemo, useState } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { AppLayout } from "@/components/layout/AppLayout";
import type { CreekyView } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";
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
import { useBridge } from "@/hooks/useBridge";
import { useCreekyEvents } from "@/hooks/useCreekyEvents";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useToast } from "@/hooks/useToast";
import { db } from "@/services/storage";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { APP_VERSION } from "@/types/creeky";

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

function getInitialView(): CreekyView {
  const hash = window.location.hash.slice(1) as CreekyView;
  if (hash && hash in TITLES) return hash;
  return "tasks";
}

export default function App() {
  const { ready: bridgeReady } = useBridge();
  const { store, refresh } = useCreekyStore();
  const { toasts, push, dismiss } = useToast();

  const [view, setView] = useState<CreekyView>(() => getInitialView());
  const [collapsed, setCollapsed] = useState(false);
  const [authed, setAuthed] = useState<boolean>(() => !!db.load().session);

  useEffect(() => {
    window.location.hash = view;
  }, [view]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1) as CreekyView;
      if (h && h in TITLES) setView(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useCreekyEvents({
    onToast: (p) => push(p.message, p.type ?? "info"),
    onNavigate: (v) => {
      if (v in TITLES) setView(v as CreekyView);
    },
  });

  const handleAuthed = useCallback(() => {
    refresh();
    setAuthed(true);
    push("Sesión iniciada.", "success");
  }, [push, refresh]);

  const handleLogout = useCallback(() => {
    const s = db.load();
    s.session = null;
    db.save(s);
    refresh();
    setAuthed(false);
    push("Sesión cerrada.", "info");
  }, [push, refresh]);


  const badges = useMemo(() => {
    const arr = (a: unknown) => Array.isArray(a) ? a as never[] : [];
    const alive = (store.tasks as unknown as { deleted?: boolean; done?: boolean; due?: string; pomodoroBlocks?: unknown[]; repeat?: number[] }[])
      .filter((t) => t && !t.deleted) as typeof store.tasks;
    const today = todayISO();
    const notifUnread = (store.notifications as unknown as { unread?: boolean }[]).filter((n) => n?.unread).length;
    const pomoReserved = alive.filter((t) => !t.done && Array.isArray(t.pomodoroBlocks) && t.pomodoroBlocks.length > 0).length;
    const pomoTodayLog = (store.pomoLog as unknown as { date?: string; mode?: string }[]).filter((p) => p?.date === today && p.mode === "focus").length;
    const manualPending = (arr(store.countdowns) as { date?: string }[]).filter((c) => c?.date && c.date >= today).length;
    const autoPending = alive.filter((t) => !t.done && t.due && t.due >= today).length;
    const matrixCount = (["q1", "q2", "q3", "q4"] as const).reduce((a, q) => a + ((store.matrix?.[q] || []) as unknown[]).length, 0);

    return {
      "tasks-badge": alive.filter((t) => !t.done).length,
      "notif-badge": notifUnread,
      "badge-calendar": alive.filter((t) => !t.done && occursOn(t as never, today)).length,
      "badge-pomodoro": pomoTodayLog + (pomoReserved > 0 ? pomoReserved : 0),
      "badge-eisenhower": alive.filter((t) => !t.done).length + matrixCount,
      "badge-habits": (arr(store.habits) as unknown[]).length,
      "badge-countdown": manualPending + autoPending,
    } satisfies Record<string, number>;
  }, [store]);

  const user = useMemo(() => {
    const s = store;
    if (!s.session) return null;
    return s.users.find((u) => u.id === s.session) || null;
  }, [store]);

  useEffect(() => {
    try {
      const alive = store.tasks.filter((t) => !t.deleted);
      console.log(
        `%cCreeky v${APP_VERSION}%c tareas vivas:${alive.length} (pendientes:${alive.filter((t) => !t.done).length}) • listas:${store.lists.length} • hoy:${alive.filter((t) => !t.done && occursOn(t, todayISO())).length} • notif sin leer:${store.notifications.filter((n) => n.unread).length}/${store.notifications.length}`,
        "font-weight:bold",
        ""
      );
    } catch { /* ignore */ }
  }, [store]);

  if (!authed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", background: "var(--bg-soft)" }}>
        <TitleBar bridgeReady={bridgeReady} />
        <div style={{ flex: 1, overflow: "auto" }}>
          <AuthView onAuthed={handleAuthed} onToast={push} />
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "tasks": return <TasksView />;
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
      default: return <TasksView />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: "var(--bg-soft)", color: "var(--text)", overflow: "hidden" }}>
      <TitleBar bridgeReady={bridgeReady} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <AppLayout
          view={view}
          onViewChange={setView}
          title={TITLES[view] ?? view}
          badges={badges}
          userInitial={(user?.name || "U")[0]?.toUpperCase()}
          onLogout={handleLogout}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        >
          {renderView()}
        </AppLayout>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      
      <span style={{ position: "fixed", bottom: 4, right: 8, fontSize: 10, color: "var(--text-tertiary)", opacity: 0.6 }}>v{APP_VERSION}</span>
    </div>
  );
}
