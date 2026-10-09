import { useTheme } from "@/hooks/useTheme";
import { CinematicThemeSwitcher } from "@/components/ui/CinematicThemeSwitcher";

/**
 * Properties for the {@link TopBar} component.
 */
interface TopBarProps {
  /** Page title displayed in the header. */
  title: string;
  /** Callback fired when the mobile menu toggle is pressed. */
  onMenuToggle?: () => void;
}

/**
 * Page header displayed above the main content.
 */
export function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-5 flex h-16 shrink-0 items-center justify-between border-b border-(--border-light) bg-(--bg-primary) px-6 relative">
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-(--accent) via-(--secondary) to-(--accent) opacity-60" />
      <div className="flex items-center gap-4">
        <button
          className="hidden h-10 w-10 items-center justify-center rounded-md text-(--text-soft) transition-colors hover:bg-(--bg-hover) hover:text-(--text) max-[768px]:flex"
          aria-label="Abrir menú"
          onClick={onMenuToggle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-6 w-6">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="truncate text-[20px] font-semibold text-(--text)" id="page-title">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <CinematicThemeSwitcher theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );
}
