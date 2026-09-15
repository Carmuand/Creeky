import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A single option in the {@link Select} dropdown.
 */
export interface SelectOption {
  /** Internal value sent to the parent state when selected. */
  value: string;
  /** Label shown to the user in the dropdown list. */
  label: string;
  /** Optional image shown alongside the label. */
  thumb?: string | ReactNode;
}

/**
 * Properties for the {@link Select} component.
 */
interface SelectProps {
  /** Currently selected value. */
  value: string;
  /** List of options displayed in the dropdown menu. */
  options: SelectOption[];
  /** Callback fired when a different option is selected. */
  onChange: (value: string) => void;
  /** Text shown when no option is currently selected. @default "Select" */
  placeholder?: string;
}

/**
 * Themed dropdown rendered via portal with viewport-aware positioning.
 */
export function Select({ value, options, onChange, placeholder = "Select" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; flip: boolean } | null>(null);

  const selected = options.find((o) => o.value === value);

  const renderThumb = (thumb: string | ReactNode | undefined) => {
    if (!thumb) return null;
    if (typeof thumb === "string") return <img src={thumb} alt="" className="h-5 w-5 rounded-md object-cover shrink-0" />;
    return <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full">{thumb}</span>;
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = triggerRef.current;
      const m = menuRef.current;
      if (t && t.contains(e.target as Node)) return;
      if (m && m.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;
      const t = trigger.getBoundingClientRect();
      const menuH = menu ? menu.offsetHeight : 220;
      const gap = 6;
      const spaceBelow = window.innerHeight - t.bottom - gap;
      const spaceAbove = t.top - gap;
      const flip = spaceBelow < Math.min(menuH, 220) && spaceAbove > spaceBelow;
      const top = flip ? Math.max(8, t.top - menuH - gap) : t.bottom + gap;
      setPos({ top, left: t.left, width: t.width, flip });
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, options.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-(--border-strong) bg-(--bg-input) px-3 py-2 text-[12.5px] text-(--text-soft) transition-colors hover:border-(--primary) cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {renderThumb(selected?.thumb)}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <span className={`text-[10px] text-(--muted) transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{
                position: "fixed",
                top: pos ? `${pos.top}px` : "-9999px",
                left: pos ? `${pos.left}px` : "-9999px",
                width: pos ? `${pos.width}px` : "auto",
                opacity: pos ? 1 : 0,
              }}
              className="z-[60] flex max-h-[220px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-(--border-strong) bg-(--bg-elevated) p-1.5 shadow-lg animate-[popIn_0.15s_ease_both]"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors cursor-pointer ${option.value === value ? "bg-(--primary-soft) text-(--text)" : "text-(--text-soft) hover:bg-(--bg-hover)"}`}
                >
                  {renderThumb(option.thumb)}
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <span className="ml-auto text-[11px] text-(--primary)">✓</span> : null}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
