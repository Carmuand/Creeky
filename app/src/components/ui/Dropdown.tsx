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
  /** Whether choosing an item closes the menu. Disable it for menus of toggles. @default true */
  closeOnSelect?: boolean;
}

/**
 * Width of the menu in pixels.
 */
const MENU_WIDTH = 192;

/**
 * Reusable dropdown menu with outside-click handling.
 *
 * The menu is rendered in a portal, so presses inside it are checked
 * against the menu element as well as the trigger. Otherwise a press on
 * an item would count as an outside click and close the menu before the
 * item receives its click.
 *
 * @param props - Component properties.
 * @returns The trigger with its floating menu.
 */
export function Dropdown({ trigger, children, align = "right", closeOnSelect = true }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const wanted = align === "right" ? rect.right - MENU_WIDTH : rect.left;
    setCoords({ top: rect.bottom + 4, left: Math.max(8, Math.min(wanted, window.innerWidth - MENU_WIDTH - 8)) });
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, align]);

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
              className="fixed z-50 flex max-h-72 flex-col overflow-y-auto rounded-lg border border-(--border-medium) bg-(--bg-primary) p-1 shadow-xl"
              onClick={() => { if (closeOnSelect) setOpen(false); }}
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
 *
 * @param props - Component properties.
 * @param props.children - Item content.
 * @param props.onClick - Called when the item is chosen.
 * @param props.danger - Whether the item uses the destructive style.
 * @returns The menu item.
 */
export function DropdownItem({ children, onClick, danger = false }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${danger ? "text-[#C62828] hover:bg-[rgba(198,40,40,0.08)]" : "text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)"}`}
    >
      {children}
    </button>
  );
}
