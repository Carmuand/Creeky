import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Properties for the {@link Dropdown} component.
 */
interface DropdownProps {
  /** Element that toggles the menu when clicked. */
  trigger: ReactNode;
  /** Menu content rendered when open. */
  children: ReactNode;
  /** Alignment of the menu relative to the trigger. @default "right" */
  align?: "left" | "right";
}

/**
 * Reusable dropdown menu with outside-click handling.
 */
export function Dropdown({ trigger, children, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open ? (
        <div className={`absolute top-full z-20 mt-1 flex w-48 flex-col rounded-lg border border-(--border-medium) bg-(--bg-primary) p-1 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Item rendered inside a {@link Dropdown} menu.
 */
export function DropdownItem({ children, onClick, danger = false }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${danger ? "text-[#C62828] hover:bg-[rgba(198,40,40,0.08)]" : "text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)"}`}
    >
      {children}
    </button>
  );
}
