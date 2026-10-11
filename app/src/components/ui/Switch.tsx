import { cn } from "@/lib/utils";

/**
 * Properties for the {@link Switch} component.
 */
interface SwitchProps {
  /** Whether the switch is on. */
  checked: boolean;
  /** Called with the next state when the user toggles the switch. */
  onChange: (next: boolean) => void;
  /** Accessible name of the switch. */
  label: string;
  /** Whether the switch ignores input. */
  disabled?: boolean;
}

/**
 * Accessible on/off switch.
 *
 * @param props - Component properties.
 * @returns The switch button.
 */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-(--accent) bg-(--accent)" : "border-(--border-medium) bg-(--bg-tertiary)",
      )}
    >
      <span aria-hidden className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-[left]", checked ? "left-5.5" : "left-0.5")} />
    </button>
  );
}
