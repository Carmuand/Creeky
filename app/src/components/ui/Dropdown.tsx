import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: align === "right" ? rect.right - 192 : rect.left, width: rect.width });
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, align]);

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && coords
        ? createPortal(
            <div
              style={{ top: coords.top, left: coords.left, width: 192 }}
              className="fixed z-50 flex flex-col rounded-lg border border-(--border-medium) bg-(--bg-primary) p-1 shadow-xl"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
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
