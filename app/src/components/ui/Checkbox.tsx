/**
 * Properties for the {@link Checkbox} component.
 */
interface CheckboxProps {
  /** Whether the checkbox is currently selected. */
  checked: boolean;
  /** Callback fired whenever the checked state changes. */
  onChange: (checked: boolean) => void;
  /** Primary label shown beside the checkbox. */
  label: string;
  /** Optional supporting text displayed beneath the label. */
  description?: string;
  /** Disables interaction and visually dims the component when true. */
  disabled?: boolean;
}

/**
 * Themed checkbox component used instead of a native `<input type="checkbox">`.
 */
export function Checkbox({ checked, onChange, label, description, disabled }: CheckboxProps) {
  return (
    <label className={`group flex items-start gap-2.5 text-[13px] text-(--text-soft) ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ${
          checked
            ? "border-(--primary) bg-(--primary)"
            : `border-(--border-strong) bg-(--bg-input) ${disabled ? "" : "group-hover:border-(--primary)"}`
        }`}
      >
        <span className={`text-[10px] text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}>✓</span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        {description ? <span className="text-[11px] text-(--muted)">{description}</span> : null}
      </span>
    </label>
  );
}
