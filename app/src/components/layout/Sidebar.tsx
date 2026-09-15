import * as React from "react";
import { CreekyIcon } from "@/components/icons/CreekyIcon";

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
  return <span className="nav-badge" id={id}>{count}</span>;
}

export function Sidebar({ view, onSelect, badges, userInitial, onLogout, collapsed, onToggleCollapse, mobileOpen }: SidebarProps) {
  const [userOpen, setUserOpen] = React.useState(false);
  React.useEffect(() => {
    if (!userOpen) return;
    const onDoc = () => setUserOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [userOpen]);

  const item = (v: CreekyView, label: string, icon: string, badgeKey?: string) => (
    <li key={v}>
      <button
        className={`nav-link ${view === v ? "active" : ""}`}
        data-page={v}
        onClick={() => onSelect(v)}
      >
        <span className="nav-icon" aria-hidden="true">
          <CreekyIcon name={icon} size={18} />
        </span>
        <span className="nav-label">{label}</span>
        {badgeKey ? <Badge id={badgeKey} count={badges[badgeKey]} /> : null}
      </button>
    </li>
  );

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`} role="navigation" aria-label="Navegación principal">
      <div className="sidebar-header">
        <div className="logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span className="logo-text">Creeky</span>
        </div>
        <button className="sidebar-toggle" aria-label="Colapsar sidebar" aria-expanded={!collapsed} onClick={onToggleCollapse}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Secciones principales">
        <ul className="nav-list" role="list">
          <li className="nav-section">
            <span className="nav-section-label">PRINCIPAL</span>
            <ul className="nav-items" role="list">
              {item("tasks", "Tareas", "tasks", "tasks-badge")}
              {item("calendar", "Calendario", "calendar", "badge-calendar")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">PRODUCTIVIDAD</span>
            <ul className="nav-items" role="list">
              {item("pomodoro", "Pomodoro", "clock", "badge-pomodoro")}
              {item("eisenhower", "Matriz Eisenhower", "eisenhower", "badge-eisenhower")}
              {item("habits", "Hábitos", "users", "badge-habits")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">HERRAMIENTAS</span>
            <ul className="nav-items" role="list">
              {item("countdown", "Cuenta regresiva", "clock", "badge-countdown")}
              {item("search", "Búsqueda", "search")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">SISTEMA</span>
            <ul className="nav-items" role="list">
              {item("sync", "Sincronización", "sync")}
              {item("notifications", "Notificaciones", "bell", "notif-badge")}
            </ul>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className={`nav-link ${view === "help" ? "active" : ""}`} data-page="help" onClick={() => onSelect("help")}>
          <span className="nav-icon" aria-hidden="true"><CreekyIcon name="help" size={18} /></span>
          <span className="nav-label">Ayuda</span>
        </button>
        <div className="user-menu">
          <button
            className="user-avatar"
            aria-expanded={userOpen}
            aria-haspopup="true"
            aria-label="Menú de usuario"
            onClick={(e) => { e.stopPropagation(); setUserOpen((o) => !o); }}
          >
            <span>{userInitial}</span>
          </button>
          <div className={`user-dropdown ${userOpen ? "" : "hidden"}`} role="menu">
            <button className="dropdown-item" role="menuitem" onClick={() => { setUserOpen(false); onSelect("profile"); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span>Perfil</span>
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" role="menuitem" onClick={() => { setUserOpen(false); onLogout?.(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
