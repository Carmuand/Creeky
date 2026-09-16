import * as React from "react";
import { Icon } from "@/components/icons/Icon";
import { TooltipSimple } from "@/components/ui/Tooltip";

export type CreekyView =
  | "tasks"
  | "calendar"
  | "pomodoro"
  | "eisenhower"
  | "habits"
  | "countdown"
  | "search"
  | "sync"
  | "notifications"
  | "help"
  | "profile";

interface SidebarProps {
  view: CreekyView;
  onSelect: (v: CreekyView) => void;
  badges: Record<string, number>;
  userInitial: string;
  onLogout?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
}

function Badge({ id, count }: { id: string; count?: number }) {
  if (!count) return null;
  return (
    <span id={id} className="ml-auto min-w-4.5 rounded-full bg-(--accent) px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
      {count}
    </span>
  );
}

function CollapsedBadge({ id, count }: { id: string; count?: number }) {
  if (!count) return null;
  return (
    <span
      id={id}
      className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-(--bg-primary) bg-(--accent) px-1 text-[10px] font-bold text-white shadow-sm"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar({ view, onSelect, badges, userInitial, onLogout, collapsed, onToggleCollapse, mobileOpen }: SidebarProps) {
  const [userOpen, setUserOpen] = React.useState(false);

  React.useEffect(() => {
    if (!userOpen) return;
    const onDoc = () => setUserOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [userOpen]);

  const navLink = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg text-[15px] transition-colors relative ${collapsed ? "justify-center p-3" : "px-4 py-3"} ${
      active ? "bg-(--accent-light) font-medium text-(--accent)" : "text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)"
    }`;

  const item = (v: CreekyView, label: string, icon: string, badgeKey?: string) => {
    const active = view === v;
    const button = (
      <button className={navLink(active)} data-page={v} onClick={() => onSelect(v)}>
        <span className={`flex shrink-0 items-center justify-center ${collapsed ? "h-6 w-6" : "h-5.5 w-5.5"}`} aria-hidden="true">
          <Icon name={icon} size={collapsed ? 20 : 18} />
        </span>
        {!collapsed ? <span className="truncate">{label}</span> : null}
        {!collapsed && badgeKey ? <Badge id={badgeKey} count={badges[badgeKey]} /> : null}
        {collapsed && badgeKey ? <CollapsedBadge id={badgeKey} count={badges[badgeKey]} /> : null}
        {active && !collapsed ? <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-(--accent)" /> : null}
      </button>
    );

    if (!collapsed) return <li key={v}>{button}</li>;

    return (
      <li key={v} className="relative">
        <TooltipSimple content={label} side="right" align="center" sideOffset={10}>
          {button}
        </TooltipSimple>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-10 flex h-[calc(100vh-40px)] flex-col border-r border-(--border-light) bg-(--bg-primary) transition-all duration-200 z-30 ${
        collapsed ? "w-18" : "w-70"
      } ${mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"} md:shadow-none`}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className={`flex items-center border-b border-(--border-light) ${collapsed ? "justify-center px-2 py-4" : "justify-between pl-4 pr-5 py-4"}`} style={{ minHeight: 64 }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 text-(--accent)">
            <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="text-[20px] font-bold tracking-tight">Creeky</span>
          </div>
        ) : null}
        <button
          aria-label="Colapsar sidebar"
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          className={`flex items-center justify-center rounded-md text-(--muted) transition-colors hover:bg-(--bg-hover) hover:text-(--text) ${collapsed ? "h-10 w-10" : "h-8 w-8"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className={`flex-1 overflow-x-hidden p-3 scrollbar-gutter-stable ${collapsed ? "overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden hover:scrollbar-thin hover:[&::-webkit-scrollbar]:block hover:[&::-webkit-scrollbar]:w-1.5" : "overflow-y-auto"}`} aria-label="Secciones principales">
        <ul className="flex flex-col gap-6">
          <li>
            <span className={`mb-2 block px-3 text-[11px] font-semibold uppercase tracking-widest text-(--muted) ${collapsed ? "hidden" : ""}`}>Principal</span>
            <ul className="flex flex-col gap-1">
              {item("tasks", "Tareas", "tasks", "tasks-badge")}
              {item("calendar", "Calendario", "calendar", "badge-calendar")}
            </ul>
          </li>
          <li>
            <span className={`mb-2 block px-3 text-[11px] font-semibold uppercase tracking-widest text-(--muted) ${collapsed ? "hidden" : ""}`}>Productividad</span>
            <ul className="flex flex-col gap-1">
              {item("pomodoro", "Pomodoro", "clock", "badge-pomodoro")}
              {item("eisenhower", "Matriz Eisenhower", "eisenhower", "badge-eisenhower")}
              {item("habits", "Hábitos", "users", "badge-habits")}
            </ul>
          </li>
          <li>
            <span className={`mb-2 block px-3 text-[11px] font-semibold uppercase tracking-widest text-(--muted) ${collapsed ? "hidden" : ""}`}>Herramientas</span>
            <ul className="flex flex-col gap-1">
              {item("countdown", "Cuenta regresiva", "clock", "badge-countdown")}
              {item("search", "Búsqueda", "search")}
            </ul>
          </li>
          <li>
            <span className={`mb-2 block px-3 text-[11px] font-semibold uppercase tracking-widest text-(--muted) ${collapsed ? "hidden" : ""}`}>Sistema</span>
            <ul className="flex flex-col gap-1">
              {item("sync", "Sincronización", "sync")}
              {item("notifications", "Notificaciones", "bell", "notif-badge")}
            </ul>
          </li>
        </ul>
      </nav>

      <div className={`border-t border-(--border-light) p-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {collapsed ? (
          <TooltipSimple content="Ayuda" side="right" align="center" sideOffset={10}>
            <button className={navLink(view === "help")} data-page="help" onClick={() => onSelect("help")}>
              <span className="flex h-5.5 w-5.5 items-center justify-center" aria-hidden="true"><Icon name="help" size={18} /></span>
            </button>
          </TooltipSimple>
        ) : (
          <button className={navLink(view === "help")} data-page="help" onClick={() => onSelect("help")}>
            <span className="flex h-5.5 w-5.5 items-center justify-center" aria-hidden="true"><Icon name="help" size={18} /></span>
            <span>Ayuda</span>
          </button>
        )}

        <div className={`relative mt-3 ${collapsed ? "flex w-full justify-center" : ""}`}>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-(--accent-border) bg-(--accent-light) text-[15px] font-semibold text-(--accent) transition-colors hover:bg-(--accent) hover:text-white"
            aria-expanded={userOpen}
            aria-haspopup="true"
            aria-label="Menú de usuario"
            onClick={(e) => { e.stopPropagation(); setUserOpen((o) => !o); }}
          >
            <span>{userInitial}</span>
          </button>
          <div className={`${userOpen ? "flex" : "hidden"} absolute bottom-full left-0 right-0 mb-2 flex-col overflow-hidden rounded-lg border border-(--border-medium) bg-(--bg-primary) shadow-lg ${collapsed ? "left-[calc(100%+8px)] right-auto bottom-0 w-47.5" : ""}`} role="menu">
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)" role="menuitem" onClick={() => { setUserOpen(false); onSelect("profile"); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span>Perfil</span>
            </button>
            <div className="h-px bg-(--border-light)" />
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#C62828] hover:bg-[rgba(198,40,40,0.08)]" role="menuitem" onClick={() => { setUserOpen(false); onLogout?.(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}