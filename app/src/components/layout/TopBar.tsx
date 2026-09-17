import { useTheme } from "@/hooks/useTheme";

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
    <header className="sticky top-0 z-5 flex h-16 shrink-0 items-center justify-between border-b border-(--border-light) bg-(--bg-primary) px-6">
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
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-medium) bg-(--bg-tertiary) text-(--text-soft) transition-colors hover:bg-(--bg-hover) hover:text-(--text) hover:border-(--border-dark)"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
