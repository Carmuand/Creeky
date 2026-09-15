import { useEffect, useRef, useState, type ReactNode } from "react";

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
 * Themed dropdown used instead of a native `<select>`.
 */
export function Select({ value, options, onChange, placeholder = "Select" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = options.find((o) => o.value === value);

  const renderThumb = (thumb: string | ReactNode | undefined) => {
    if (!thumb) return null;
    if (typeof thumb === "string") return <img src={thumb} alt="" className="h-5 w-5 rounded-md object-cover shrink-0" />;
    return <span className="flex h-4.5 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-sm">{thumb}</span>;
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-(--border-strong) bg-(--bg-input) px-3 py-2 text-[12.5px] text-(--text-soft) transition-colors hover:border-(--primary) cursor-pointer"
      >
        <span className="flex min-w-0 items-center gap-2">
          {renderThumb(selected?.thumb)}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <span className={`text-[10px] text-(--muted) transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex max-h-55 flex-col gap-0.5 overflow-y-auto rounded-lg border border-(--border-strong) bg-(--bg-elevated) p-1.5 shadow-lg animate-[popIn_0.15s_ease_both]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors cursor-pointer ${option.value === value ? "bg-(--primary-soft) text-(--text)" : "text-(--text-soft) hover:bg-(--bg-hover)"}`}
            >
              {renderThumb(option.thumb)}
              <span className="truncate">{option.label}</span>
              {option.value === value ? <span className="ml-auto text-[11px] text-(--primary)">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
