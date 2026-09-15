import { useState } from "react";
import { Sidebar, type CreekyView } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Properties for the {@link AppLayout} component.
 */
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

/**
 * Application layout with sidebar and main content area.
 */
export function AppLayout({ view, onViewChange, title, badges, userInitial = "U", onLogout, collapsed, onToggleCollapse, children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-1 bg-(--bg-secondary) overflow-hidden">
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
      <div
        className={`fixed inset-0 top-10 bg-black/50 z-30 transition-opacity md:hidden ${mobileOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />
      <main className="flex flex-1 min-w-0 flex-col overflow-hidden ml-18 md:ml-18" role="main">
        <TopBar title={title} onMenuToggle={() => setMobileOpen((o) => !o)} />
        <div className="flex-1 overflow-y-auto p-6 max-[768px]:p-4">{children}</div>
      </main>
    </div>
  );
}
