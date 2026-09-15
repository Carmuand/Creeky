interface TopBarProps {
  title: string;
  onMenuToggle?: () => void;
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="mobile-menu-toggle" aria-label="Abrir menú" onClick={onMenuToggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="page-title" id="page-title">{title}</h1>
      </div>
    </header>
  );
}
