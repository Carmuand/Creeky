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
  const item = (v: CreekyView, label: string, icon: string, badgeKey?: string) => (
    <li key={v}>
      <button
        className={`nav-link ${view === v ? "active" : ""}`}
        data-page={v}
        onClick={() => onSelect(v)}
      >
        {/* inline svg icon using simple text for now — replace with lucide later */}
        <span className="nav-icon" aria-hidden="true" style={{ display: "inline-flex", width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
          {icon}
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
              {item("tasks", "Tareas", "✓", "tasks-badge")}
              {item("calendar", "Calendario", "📅", "badge-calendar")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">PRODUCTIVIDAD</span>
            <ul className="nav-items" role="list">
              {item("pomodoro", "Pomodoro", "⏱", "badge-pomodoro")}
              {item("eisenhower", "Matriz Eisenhower", "⊞", "badge-eisenhower")}
              {item("habits", "Hábitos", "👥", "badge-habits")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">HERRAMIENTAS</span>
            <ul className="nav-items" role="list">
              {item("countdown", "Cuenta regresiva", "⏳", "badge-countdown")}
              {item("search", "Búsqueda", "🔍")}
            </ul>
          </li>
          <li className="nav-section">
            <span className="nav-section-label">SISTEMA</span>
            <ul className="nav-items" role="list">
              {item("sync", "Sincronización", "🔄")}
              {item("notifications", "Notificaciones", "🔔", "notif-badge")}
            </ul>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className={`nav-link ${view === "help" ? "active" : ""}`} data-page="help" onClick={() => onSelect("help")}>
          <span className="nav-icon" aria-hidden="true">?</span>
          <span className="nav-label">Ayuda</span>
        </button>
        <div className="user-menu">
          <button className="user-avatar" aria-label="Menú de usuario" onClick={() => onSelect("profile")}>
            <span>{userInitial}</span>
          </button>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onSelect("profile")}>Perfil</button>
            {onLogout ? <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ color: "#C62828" }}>Salir</button> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
