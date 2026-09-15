import { useState } from "react";
import { Sidebar, type CreekyView } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  view: CreekyView;
  onViewChange: (v: CreekyView) => void;
  title: string;
  badges: Record<string, number>;
  userInitial?: string;
  onLogout?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

export function AppLayout({
  view,
  onViewChange,
  title,
  badges,
  userInitial = "U",
  onLogout,
  collapsed,
  onToggleCollapse,
  children,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        onSelect={(v) => { onViewChange(v); setMobileOpen(false); }}
        badges={badges}
        userInitial={userInitial}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        mobileOpen={mobileOpen}
      />
      {/* overlay for mobile */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "visible" : "hidden"}`}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />
      <main className="main-content" role="main">
        <TopBar title={title} onMenuToggle={() => setMobileOpen((o) => !o)} />
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
